#!/usr/bin/env python3
"""Observe source and write evidence outside the project; never edit or deploy."""
from __future__ import annotations
import argparse,fcntl,hashlib,io,json,os,re,selectors,shutil,subprocess,sys,tarfile,tempfile,time
from contextlib import contextmanager
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlsplit
sys.dont_write_bytecode=True
from checks import scan,iter_files,VERSION
from sandbox import run_sandboxed_tests

MAX_SNAPSHOT=100*1024*1024
MAX_ENTRY=5*1024*1024

def external_path(path,root):
    resolved=Path(path).expanduser().resolve()
    try:resolved.relative_to(Path(root).resolve())
    except ValueError:pass
    else:raise ValueError('Reports and state must be outside the source directory.')
    if any((ancestor/'.git').exists() for ancestor in (resolved,*resolved.parents)):raise ValueError('Reports and state must be outside any Git checkout.')
    return resolved

def fingerprint(root):
    root=Path(root).resolve(strict=True);digest=hashlib.sha256()
    for path in iter_files(root):
        digest.update(path.relative_to(root).as_posix().encode()+b'\0')
        if path.stat().st_size>MAX_ENTRY:digest.update(f'oversized:{path.stat().st_size}:{path.stat().st_mtime_ns}'.encode());continue
        with path.open('rb') as stream:
            for chunk in iter(lambda:stream.read(65536),b''):digest.update(chunk)
    return digest.hexdigest()

def collect(root,include_tests=False,revision=None):
    report=scan(root);report['generated_at']=datetime.now(timezone.utc).isoformat();report['revision']=revision
    test=run_sandboxed_tests(root) if include_tests else {'id':'tests','label':'Isolated unit tests','status':'not_run','details':'Isolated test execution was not requested.'}
    report['checks'].append(test)
    if test['status']=='failed':
        report['findings'].append({'check':'tests','severity':'error','path':'tests','line':None,'description':'Isolated unit tests failed.','recommendation':'Inspect tests in a controlled environment.'});report['summary']['errors_or_high']+=1;report['status']='attention'
    return report

def atomic_json(path,data):
    path.parent.mkdir(parents=True,exist_ok=True);fd,tmp=tempfile.mkstemp(prefix='.review-',suffix='.tmp',dir=path.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as stream:json.dump(data,stream,ensure_ascii=False,indent=2);stream.write('\n')
        os.chmod(tmp,0o600);os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def save_report(state,report):
    reports=state/'reports';reports.mkdir(parents=True,exist_ok=True);atomic_json(reports/'latest.json',report)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');atomic_json(reports/f'{stamp}.json',report)

def valid_repo(url):
    parsed=urlsplit(url)
    if parsed.scheme!='https' or parsed.netloc.lower()!='github.com' or parsed.query or parsed.fragment or not re.fullmatch(r'/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?',parsed.path):raise ValueError('Use the HTTPS URL of a public github.com repository without credentials.')
    return url

def git(args,cwd=None,timeout=90):
    env={'PATH':os.defpath,'LANG':'C.UTF-8','GIT_TERMINAL_PROMPT':'0','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':os.devnull}
    return subprocess.run(['git','-c','credential.helper=','-c','core.hooksPath=/dev/null','-c','protocol.file.allow=never',*args],cwd=cwd,env=env,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)

def fetch_commit(repo,branch,state):
    valid_repo(repo)
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/-]*',branch) or '..' in branch or branch.endswith('/') or branch.endswith('.'):raise ValueError('Invalid branch name.')
    mirror=state/'mirror.git'
    if not mirror.exists():git(['init','--bare',str(mirror)])
    git(['fetch','--no-tags','--depth=1','--',repo,f'+refs/heads/{branch}:refs/remotes/review/observed'],cwd=mirror)
    commit=git(['rev-parse','--verify','refs/remotes/review/observed^{commit}'],cwd=mirror).stdout.decode().strip()
    if not re.fullmatch(r'[a-f0-9]{40,64}',commit):raise ValueError('Git returned an invalid commit ID.')
    return mirror,commit

def archive_bytes(mirror,commit):
    env={'PATH':os.defpath,'LANG':'C.UTF-8','GIT_TERMINAL_PROMPT':'0','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':os.devnull}
    command=['git','-c','credential.helper=','-c','core.hooksPath=/dev/null','-c','protocol.file.allow=never','archive','--format=tar',commit]
    process=subprocess.Popen(command,cwd=mirror,env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL);chunks=[];size=0;deadline=time.monotonic()+90
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout,selectors.EVENT_READ)
            while True:
                remaining=deadline-time.monotonic()
                if remaining<=0 or not selector.select(remaining):raise subprocess.TimeoutExpired(command,90)
                block=os.read(process.stdout.fileno(),65536)
                if not block:break
                size+=len(block)
                if size>MAX_SNAPSHOT:raise ValueError('Snapshot exceeds the inspection limit.')
                chunks.append(block)
        if process.wait(timeout=max(.1,deadline-time.monotonic())):raise subprocess.CalledProcessError(process.returncode,command)
        return b''.join(chunks)
    finally:
        if process.poll() is None:process.kill();process.wait()
        if process.stdout:process.stdout.close()

def extract_snapshot(mirror,commit,destination):
    tree=git(['ls-tree','-r','-z','--full-tree',commit],cwd=mirror).stdout;expected={}
    for entry in tree.split(b'\0'):
        if not entry:continue
        info,path=entry.split(b'\t',1);mode,kind,object_id=info.split(b' ',2)
        if kind!=b'blob' or mode not in (b'100644',b'100755'):raise ValueError('Snapshot contains a symlink, submodule, or unsupported entry.')
        name=path.decode('utf-8');object_id=object_id.decode('ascii')
        if name in expected or not re.fullmatch(r'(?:[a-f0-9]{40}|[a-f0-9]{64})',object_id):raise ValueError('Snapshot contains an invalid object entry.')
        expected[name]=object_id
    archive=archive_bytes(mirror,commit);total=0;root=destination.resolve();extracted=set()
    with tarfile.open(fileobj=io.BytesIO(archive),mode='r:') as tar:
        for member in tar:
            if member.isdir():continue
            if not member.isfile():raise ValueError('Snapshot contains an unsupported file type.')
            total+=member.size
            if member.size>MAX_ENTRY or total>MAX_SNAPSHOT:raise ValueError('Snapshot exceeds inspection limits.')
            if member.name not in expected or member.name in extracted:raise ValueError('Snapshot has unexpected or duplicate files.')
            extracted.add(member.name);path=(root/member.name).resolve()
            try:path.relative_to(root)
            except ValueError:raise ValueError('Snapshot contains an unsafe file path.') from None
            path.parent.mkdir(parents=True,exist_ok=True);source=tar.extractfile(member)
            if source is None:raise ValueError('Could not read an archived file.')
            object_id=expected[member.name];digest=hashlib.sha1() if len(object_id)==40 else hashlib.sha256()
            digest.update(f'blob {member.size}\0'.encode())
            with source,path.open('wb') as target:
                for block in iter(lambda:source.read(65536),b''):digest.update(block);target.write(block)
            if digest.hexdigest()!=object_id:raise ValueError('Snapshot changed tracked content; review is incomplete.')
    if extracted!=set(expected):raise ValueError('Snapshot omitted tracked files; review is incomplete.')

@contextmanager
def state_lock(state):
    with (state/'review.lock').open('a+') as handle:
        try:fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise ValueError('Another reviewer is already using this state directory.') from None
        try:yield
        finally:fcntl.flock(handle,fcntl.LOCK_UN)

def watch_local(root,state,interval,include_tests,once=False):
    root=Path(root).resolve(strict=True);state=external_path(state,root);state.mkdir(parents=True,exist_ok=True);last=None
    with state_lock(state):
        while True:
            success=True
            try:
                current=fingerprint(root)
                if current!=last:
                    report=collect(root,include_tests,revision=current)
                    if fingerprint(root)!=current:raise ValueError('Source changed during review; retrying on the next check.')
                    report['source']={'kind':'directory','revision_kind':'sha256'};save_report(state,report);last=current
                    print(json.dumps({'event':'review_complete','status':report['status'],'revision':current}),flush=True)
            except (OSError,ValueError) as exc:success=False;print(json.dumps({'event':'review_error','error':str(exc)}),file=sys.stderr,flush=True)
            if once:return success
            time.sleep(interval)

def watch_git(repo,branch,state,interval,include_tests,once=False):
    state=Path(state).expanduser().resolve()
    if any((ancestor/'.git').exists() for ancestor in (state,*state.parents)):raise ValueError('State must be outside any Git checkout.')
    state.mkdir(parents=True,exist_ok=True);last=None
    with state_lock(state):
        while True:
            success=True
            try:
                mirror,commit=fetch_commit(repo,branch,state)
                if commit!=last:
                    with tempfile.TemporaryDirectory(prefix='snapshot-',dir=state) as temporary:
                        root=Path(temporary);extract_snapshot(mirror,commit,root);report=collect(root,include_tests,revision=commit);report['source']={'kind':'public_git','repository':repo,'branch':branch};save_report(state,report)
                    last=commit;print(json.dumps({'event':'review_complete','status':report['status'],'revision':commit}),flush=True)
            except (OSError,ValueError,subprocess.SubprocessError,tarfile.TarError,UnicodeError) as exc:success=False;print(json.dumps({'event':'review_error','error':type(exc).__name__,'message':'Fetch or review failed; no success report was written.'}),file=sys.stderr,flush=True)
            if once:return success
            time.sleep(interval)

def main():
    parser=argparse.ArgumentParser(description='Read-only website reviewer; never edits source or deploys.');parser.add_argument('--version',action='version',version=VERSION);sub=parser.add_subparsers(dest='command',required=True)
    scanp=sub.add_parser('scan');scanp.add_argument('--root',required=True);scanp.add_argument('--output');scanp.add_argument('--sandboxed-tests',action='store_true')
    watch=sub.add_parser('watch');watch.add_argument('--root',required=True);watch.add_argument('--state-dir',required=True);watch.add_argument('--interval',type=float,default=60);watch.add_argument('--once',action='store_true');watch.add_argument('--sandboxed-tests',action='store_true')
    remote=sub.add_parser('watch-git');remote.add_argument('--repo',required=True);remote.add_argument('--branch',required=True);remote.add_argument('--state-dir',required=True);remote.add_argument('--interval',type=float,default=300);remote.add_argument('--once',action='store_true');remote.add_argument('--sandboxed-tests',action='store_true')
    args=parser.parse_args()
    if getattr(args,'interval',1)<=0:parser.error('Interval must be positive.')
    try:
        if args.command=='scan':
            root=Path(args.root).resolve(strict=True);output=external_path(args.output,root) if args.output else None;before=fingerprint(root);report=collect(root,args.sandboxed_tests,revision=before)
            if fingerprint(root)!=before:raise ValueError('Source changed during review; retry the scan.')
            if output:atomic_json(output,report)
            else:print(json.dumps(report,ensure_ascii=False,indent=2))
            return 1 if report['status']=='attention' else 0
        if args.command=='watch':success=watch_local(args.root,args.state_dir,args.interval,args.sandboxed_tests,args.once)
        else:success=watch_git(args.repo,args.branch,args.state_dir,args.interval,args.sandboxed_tests,args.once)
        return 0 if success else 2
    except (OSError,ValueError) as exc:print(f'Reviewer error: {exc}',file=sys.stderr);return 2
if __name__=='__main__':sys.exit(main())
