"""Optional network-isolated test execution; never fall back to the host."""
from __future__ import annotations
import os,shutil,subprocess
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
