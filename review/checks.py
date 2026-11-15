"""Limited, read-only source checks. Candidate code is never imported or run."""
from __future__ import annotations
import json, os, re, shutil, subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

VERSION = '0.1.0'
SKIP = {'.git', '.openai', 'node_modules', '.venv', '__pycache__', '.cache'}
MAX_FILE = 5 * 1024 * 1024
SOURCE_TYPES = {'.html', '.js', '.mjs', '.cjs', '.json', '.css', '.yml', '.yaml', '.py', '.md', '.txt', '.toml'}
SECRET_RULES = [
    ('private-key', re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')),
    ('github-token', re.compile(r'\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b')),
    ('api-key', re.compile(r'\bsk-proj-[A-Za-z0-9_-]{30,}\b')),
    ('aws-access-key', re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ('slack-token', re.compile(r'\bxox[baprs]-[A-Za-z0-9-]{20,}\b')),
]
RISK_RULES = [
    ('dynamic-evaluation', re.compile(r'\beval\s*\(|\bnew\s+Function\s*\('), 'Dynamic code execution needs manual review.'),
    ('html-injection-sink', re.compile(r'\.(?:innerHTML|outerHTML)\s*=|\.insertAdjacentHTML\s*\(|\bdocument\.write\s*\('), 'HTML injection sink needs input-safety review.'),
]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang=False;self.title=False;self.title_text='';self.in_title=False;self.description=False;self.viewport=False
        self.links=[];self.issues=[];self.ids=set();self.label_depth=0;self.explicit_labels=set();self.controls=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);line=self.getpos()[0]
        if tag=='html':self.lang=bool(a.get('lang','').strip())
        if tag=='title':self.title=True;self.in_title=True
        if tag=='meta' and a.get('name','').lower()=='description':self.description=bool(a.get('content','').strip())
        if tag=='meta' and a.get('name','').lower()=='viewport':self.viewport=bool(a.get('content','').strip())
        if a.get('id'):
            if a['id'] in self.ids:self.issues.append((line,'Duplicate HTML ID.'))
            self.ids.add(a['id'])
        if tag=='label':
            self.label_depth+=1
            if a.get('for'):self.explicit_labels.add(a['for'])
        if tag=='img' and 'alt' not in a:self.issues.append((line,'Image is missing an alt attribute.'))
        if tag in ('input','select','textarea') and a.get('type','').lower() not in ('hidden','submit','reset','button','image'):
            self.controls.append((line,a.get('id'),self.label_depth>0 or bool(a.get('aria-label')) or bool(a.get('aria-labelledby'))))
        if tag=='a' and a.get('target')=='_blank' and not {'noopener','noreferrer'}.intersection(a.get('rel','').lower().split()):
            self.issues.append((line,'A new-tab link is missing noopener or noreferrer.'))
        if tag in ('a','link','script','img','use'):
            value=a.get('href') if tag in ('a','link','use') else a.get('src')
            if value:self.links.append((line,value))
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='label':self.label_depth=max(0,self.label_depth-1)
    def handle_data(self,data):
        if self.in_title:self.title_text+=data

def iter_files(root):
    for base,dirs,names in os.walk(root,topdown=True,followlinks=False):
        dirs[:]=sorted(d for d in dirs if d not in SKIP and not (Path(base)/d).is_symlink())
        for name in sorted(names):
            path=Path(base)/name
            if not path.is_symlink() and path.is_file():yield path

def local_target(root,page,url):
    try:parts=urlsplit(url)
    except ValueError:return None
    if parts.scheme or parts.netloc or url.startswith('//') or not parts.path:return None
    path=unquote(parts.path)
    if '\x00' in path or '\\' in path:return False
    target=root/path.lstrip('/') if path.startswith('/') else page.parent/path
    try:target=target.resolve();target.relative_to(root)
    except (OSError,ValueError):return False
    if target.is_dir():target=target/'index.html'
    return target.is_file()

def scan(root):
    root=Path(root).resolve(strict=True)
    if not root.is_dir():raise ValueError('The source path must be a directory.')
    findings=[];checks=[];files=list(iter_files(root));relative=lambda p:p.relative_to(root).as_posix()
    def add(check,severity,path,line,description,recommendation):findings.append(dict(check=check,severity=severity,path=path,line=line,description=description,recommendation=recommendation))
    def check(id,label,status,details):checks.append(dict(id=id,label=label,status=status,details=details))
    pages=[p for p in files if p.suffix.lower()=='.html'];parsed=0
    for p in pages:
        path=relative(p)
        if p.stat().st_size>MAX_FILE:add('html','warning',path,None,'HTML exceeds the inspection limit.','Review the file separately.');continue
        try:parser=Page();parser.feed(p.read_text(encoding='utf-8'));parser.close();parsed+=1
        except (UnicodeError,ValueError):add('html','error',path,None,'Could not parse HTML.','Fix encoding or markup.');continue
        if not parser.lang:add('html','warning',path,1,'Document language is missing.','Add a language to the html element.')
        if not parser.title or not parser.title_text.strip():add('html','warning',path,1,'Page title is missing.','Add a non-empty title.')
        if not parser.description:add('html','info',path,1,'Meta description is missing.','Consider adding a specific description.')
        if not parser.viewport:add('html','warning',path,1,'Viewport metadata is missing.','Add responsive viewport metadata.')
        for line,msg in parser.issues:add('html','warning',path,line,msg,'Review the affected element.')
        for line,control_id,labelled in parser.controls:
            if not labelled and control_id not in parser.explicit_labels:add('html','warning',path,line,'Form control has no associated label.','Add an accessible name.')
        for line,url in parser.links:
            if local_target(root,p,url) is False:add('links','warning',path,line,'A local link or asset is missing or outside the source root.','Correct the path or add the file.')
    check('html','HTML structure and basic accessibility','completed',f'Inspected {parsed} HTML pages; not a full accessibility audit.')
    check('links','Local link and asset integrity','completed','Checked local files only; external links and runtime routes were not checked.')
    catalog=root/'catalog.json'
    if catalog.is_file() and not catalog.is_symlink():
        try:
            data=json.loads(catalog.read_text(encoding='utf-8'));items=data.get('items')
            if not isinstance(items,list):raise ValueError()
            seen=set()
            for n,item in enumerate(items,1):
                if not isinstance(item,dict) or not all(isinstance(item.get(k),str) and item[k] for k in ('name','type','url','date')):
                    add('catalog','error','catalog.json',None,f'Catalog item {n} is missing required fields.','Add name, type, date, and URL.');continue
                if item['url'] in seen:add('catalog','warning','catalog.json',None,f'Catalog item {n} repeats a URL.','Correct the duplicate.')
                seen.add(item['url'])
                if local_target(root,root/'index.html',item['url']) is False:add('catalog','error','catalog.json',None,f'Catalog item {n} points to a missing page.','Add the page or correct the URL.')
                module=item.get('module')
                if isinstance(module,dict) and isinstance(module.get('url'),str) and local_target(root,root/'index.html',module['url']) is False:add('catalog','error','catalog.json',None,f'Catalog item {n} points to a missing module.','Add the module or correct the URL.')
            check('catalog','Catalog integrity','completed',f'Inspected {len(items)} entries.')
        except (OSError,UnicodeError,json.JSONDecodeError,ValueError,AttributeError):
            add('catalog','error','catalog.json',None,'Catalog could not be validated.','Fix JSON syntax and ensure items is an array.')
            check('catalog','Catalog integrity','incomplete','Catalog is invalid or unreadable.')
    else:check('catalog','Catalog integrity','not_applicable','No catalog.json at the source root.')
    node=shutil.which('node');scripts=[p for p in files if p.suffix.lower() in ('.js','.mjs','.cjs')]
    if not node:check('syntax','JavaScript syntax','not_run','Node.js is unavailable.')
    else:
        completed=0
        for p in scripts:
            if p.stat().st_size>MAX_FILE:add('syntax','warning',relative(p),None,'Script exceeds the inspection limit.','Review separately.');continue
            try:
                result=subprocess.run([node,'--check',str(p)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15,env={'PATH':os.defpath,'LANG':'C.UTF-8','NODE_OPTIONS':''},check=False);completed+=1
                if result.returncode:add('syntax','error',relative(p),None,'JavaScript syntax check failed.','Inspect syntax in an isolated environment.')
            except (OSError,subprocess.TimeoutExpired):add('syntax','error',relative(p),None,'JavaScript syntax check did not complete.','Check the file and Node installation.')
        check('syntax','JavaScript syntax','completed' if completed==len(scripts) else 'incomplete',f'Checked {completed} of {len(scripts)} scripts without executing them.')
    inspected=0;skipped=0
    for p in files:
        if p.suffix.lower() not in SOURCE_TYPES and p.name!='.env':continue
        if p.stat().st_size>MAX_FILE:skipped+=1;continue
        try:content=p.read_text(encoding='utf-8')
        except (OSError,UnicodeError):skipped+=1;continue
        inspected+=1
        for name,pattern in SECRET_RULES:
            match=pattern.search(content)
            if match:add('security','high',relative(p),content.count('\n',0,match.start())+1,f'Possible {name} detected; value withheld.','Verify and rotate any real exposed credential.')
        if p.suffix.lower() in ('.js','.mjs','.cjs'):
            for name,pattern,description in RISK_RULES:
                match=pattern.search(content)
                if match:add('security','warning',relative(p),content.count('\n',0,match.start())+1,description,'Inspect the affected code and data flow.')
        if p.suffix.lower() in ('.yml','.yaml') and '.github/workflows/' in relative(p):
            if re.search(r'\bpull_request_target\s*:',content):add('security','warning',relative(p),None,'Workflow uses pull_request_target.','Review privilege boundaries.')
            if re.search(r'(?m)^\s*contents\s*:\s*write\s*$',content):add('security','warning',relative(p),None,'Workflow requests repository write permissions.','Use read-only permissions where possible.')
    check('security','Security signals','incomplete' if skipped else 'completed',f'Inspected {inspected} text files; skipped {skipped}. This is not a full vulnerability or secret scan.')
    check('vulnerabilities','Dependency vulnerability scan','not_run','Trivy and its database are not configured.')
    check('secrets','Dedicated secret scan','not_run','Betterleaks is not configured.')
    check('browser','Browser and accessibility tests','not_run','Playwright tests are not configured.')
    check('ai','AI code review','not_run','PR-Agent and a local model are not configured.')
    errors=sum(f['severity'] in ('error','high') for f in findings);warnings=sum(f['severity']=='warning' for f in findings)
    return {'reviewer':'YorpHives Read-Only Reviewer','version':VERSION,'status':'attention' if errors or warnings else 'no_findings_in_completed_checks','summary':{'errors_or_high':errors,'warnings':warnings,'informational':sum(f['severity']=='info' for f in findings),'files_seen':len(files)},'checks':checks,'findings':findings}
