"""Optional network-isolated test execution; never fall back to the host."""
from __future__ import annotations
import json,os,shutil,subprocess
from pathlib import Path

def run_sandboxed_tests(root):
    root=Path(root).resolve(strict=True);folder=root/'tests'
    tests=sorted(p for p in folder.glob('*.test.mjs') if p.is_file() and not p.is_symlink()) if folder.is_dir() else []
    if not tests:return {'id':'tests','label':'Isolated unit tests','status':'not_run','details':'No tests/*.test.mjs files were found.'}
    bwrap=shutil.which('bwrap');node=shutil.which('node')
    if not bwrap or not node:return {'id':'tests','label':'Isolated unit tests','status':'not_run','details':'bubblewrap or Node.js is unavailable; candidate tests were not executed.'}
    node=str(Path(node).resolve())
    if not Path('/lib').exists() or not Path('/lib64').exists():return {'id':'tests','label':'Isolated unit tests','status':'not_run','details':'Runtime library paths were not found.'}
    common=[bwrap,'--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--clearenv','--setenv','PATH','/runtime','--setenv','TMPDIR','/tmp','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--dir','/runtime','--ro-bind',node,'/runtime/node','--ro-bind',str(root),'/work','--chdir','/work','--proc','/proc','--dev','/dev','--tmpfs','/tmp']
    env={'PATH':os.defpath,'LANG':'C.UTF-8'};phase='probe'
    try:
        probe=subprocess.run(common+['--','/runtime/node','--version'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15,env=env,check=False)
        if probe.returncode:return {'id':'tests','label':'Isolated unit tests','status':'not_run','details':'Sandbox could not start; no candidate tests were executed.'}
        phase='tests';args=['/runtime/node','--test']+[f'tests/{p.name}' for p in tests]
        done=subprocess.run(common+['--']+args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=120,env=env,check=False)
        return {'id':'tests','label':'Isolated unit tests','status':'passed' if done.returncode==0 else 'failed','details':f'{len(tests)} test files ran in a network-isolated sandbox.' if done.returncode==0 else 'Isolated test command failed; inspect in a controlled environment.'}
    except subprocess.TimeoutExpired:return {'id':'tests','label':'Isolated unit tests','status':'failed' if phase=='tests' else 'not_run','details':'Isolated test run timed out.' if phase=='tests' else 'Sandbox probe timed out; no tests were executed.'}
    except OSError:return {'id':'tests','label':'Isolated unit tests','status':'not_run','details':'Sandbox could not start; no host fallback was used.'}

def run_sandboxed_browser(root):
    """Run trusted browser checks against a read-only, network-isolated snapshot."""
    skipped=lambda message:{'id':'browser','label':'Website browser tests','status':'not_run','details':message,'cases':[]}
    root=Path(root).resolve(strict=True);script=Path(__file__).resolve().with_name('browser-check.cjs')
    try:script.relative_to(root)
    except ValueError:pass
    else:return skipped('Run the trusted reviewer from outside the candidate source directory.')
    bwrap=shutil.which('bwrap');node=shutil.which('node')
    module_dir=os.environ.get('YH_PLAYWRIGHT_NODE_MODULES');browser_dir=os.environ.get('YH_PLAYWRIGHT_BROWSERS')
    if not bwrap or not node:return skipped('bubblewrap or Node.js is unavailable.')
    if not module_dir or not browser_dir:return skipped('A trusted Playwright runtime and browser directory are not configured.')
    try:
        modules=Path(module_dir).resolve(strict=True);browsers=Path(browser_dir).resolve(strict=True)
        for value in (modules,browsers):
            try:value.relative_to(root)
            except ValueError:pass
            else:return skipped('The browser runtime must be stored outside the candidate source.')
        package=modules/'playwright'/'package.json'
        if not package.is_file() or not browsers.is_dir() or not script.is_file():return skipped('The configured Playwright runtime is incomplete.')
        if json.loads(package.read_text(encoding='utf-8')).get('version')!='1.62.1':return skipped('The configured Playwright version does not match the expected version 1.62.1.')
    except (OSError,ValueError,AttributeError):return skipped('The configured Playwright runtime cannot be read.')
    if not Path('/usr').is_dir() or not Path('/lib').exists() or not Path('/lib64').exists():return skipped('System runtime library paths were not found.')
    common=[bwrap,'--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--clearenv',
            '--setenv','PATH','/runtime:/usr/bin','--setenv','HOME','/tmp','--setenv','TMPDIR','/tmp',
            '--setenv','NODE_PATH','/test-runtime/node_modules','--setenv','PLAYWRIGHT_BROWSERS_PATH','/test-runtime/browsers',
            '--setenv','YH_BROWSER_SANDBOX','1','--setenv','YH_SITE_ROOT','/work',
            '--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64',
            '--dir','/runtime','--ro-bind',str(Path(node).resolve()),'/runtime/node',
            '--dir','/test-runtime','--ro-bind',str(modules),'/test-runtime/node_modules','--ro-bind',str(browsers),'/test-runtime/browsers',
            '--dir','/review','--ro-bind',str(script),'/review/browser-check.cjs',
            '--ro-bind',str(root),'/work','--chdir','/work','--proc','/proc','--dev','/dev','--tmpfs','/tmp']
    env={'PATH':os.defpath,'LANG':'C.UTF-8'}
    try:
        probe=subprocess.run(common+['--','/runtime/node','--version'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15,env=env,check=False)
        if probe.returncode:return skipped('The isolated browser sandbox could not start; no browser checks were run.')
        result=subprocess.run(common+['--','/runtime/node','/review/browser-check.cjs'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=180,env=env,check=False)
        if len(result.stdout)>65536:return skipped('The browser test runtime returned an oversized result.')
        payload=json.loads(result.stdout)
        if not isinstance(payload,dict) or payload.get('status') not in ('passed','failed','not_run'):return skipped('The browser test runtime returned an invalid result.')
        # Do not pass untrusted browser output or exception text into reports.
        allowed={'Home page and recent additions','Free tools search','Word counter produces and resets a result','Mobile navigation','Every local catalog tool page loads'}
        cases=payload.get('cases',[])
        if not isinstance(cases,list) or any(not isinstance(c,dict) or c.get('name') not in allowed or c.get('status') not in ('passed','failed') for c in cases):return skipped('The browser test runtime returned invalid check results.')
        if payload['status']=='passed' and (result.returncode!=0 or {c['name'] for c in cases}!=allowed or len(cases)!=len(allowed) or any(c['status']!='passed' for c in cases)):return skipped('The browser test result was incomplete.')
        if payload['status']=='failed' and not any(c['status']=='failed' for c in cases):return {'id':'browser','label':'Website browser tests','status':'failed','details':'The browser suite could not validate the website catalog.','cases':[]}
        status=payload['status'];return {'id':'browser','label':'Website browser tests','status':status,'details':'Browser checks ran on an isolated local snapshot.' if status!='not_run' else 'The isolated browser could not start; no browser checks were run.','cases':[{'name':c['name'],'status':c['status']} for c in cases]}
    except subprocess.TimeoutExpired:return skipped('The isolated browser check timed out; results are incomplete.')
    except (OSError,ValueError,TypeError,json.JSONDecodeError):return skipped('The isolated browser check could not run.')
