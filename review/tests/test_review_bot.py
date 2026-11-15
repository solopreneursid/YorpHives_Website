"""Behavioral checks for the local, read-only reviewer."""
import contextlib
import io
import json
import os
from pathlib import Path
import selectors
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.dont_write_bytecode = True
REVIEW = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REVIEW))
import bot
import checks
import sandbox

PAGE = '''<!doctype html><html lang="en"><head><title>Example</title>
<meta name="viewport" content="width=device-width"><meta name="description" content="An example">
</head><body><a href="thing/">Visit</a><label>Text <input name="text"></label></body></html>'''


def fixture(root):
    root = Path(root)
    (root / 'index.html').write_text(PAGE, encoding='utf-8')
    (root / 'thing').mkdir()
    (root / 'thing' / 'index.html').write_text(PAGE.replace('thing/', '../'), encoding='utf-8')
    (root / 'app.js').write_text('const ready = true;\n', encoding='utf-8')
    (root / 'catalog.json').write_text(json.dumps({'items': [
        {'name': 'Example', 'type': 'tool', 'url': 'thing/', 'date': '2026-01-01'}
    ]}), encoding='utf-8')


def run_git(root, *args):
    return subprocess.run(['git', *args], cwd=root, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE).stdout.decode().strip()


class ReviewChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.source = self.base / 'website'
        self.source.mkdir()
        fixture(self.source)

    def tearDown(self):
        self.temp.cleanup()

    def test_clean_checks_do_not_modify_source_and_report_skipped_tools(self):
        before = bot.fingerprint(self.source)
        report = bot.collect(self.source)
        self.assertEqual(report['status'], 'no_findings_in_completed_checks')
        self.assertEqual(before, bot.fingerprint(self.source))
        self.assertEqual({c['id'] for c in report['checks'] if c['status'] == 'not_run'},
                         {'vulnerabilities', 'secrets', 'browser', 'ai', 'tests'})

    def test_broken_links_unlabelled_inputs_and_javascript_are_detected(self):
        (self.source / 'index.html').write_text(PAGE.replace('thing/', 'missing/').replace(
            '<label>Text <input name="text"></label>', '<input name="text">'), encoding='utf-8')
        (self.source / 'app.js').write_text('const = ;', encoding='utf-8')
        report = checks.scan(self.source)
        self.assertEqual(report['status'], 'attention')
        self.assertTrue({'links', 'html', 'syntax'} <= {f['check'] for f in report['findings']})

    def test_possible_secret_is_reported_without_value(self):
        secret = 'gh' + 'p_' + 'A' * 36
        (self.source / 'note.txt').write_text(secret, encoding='utf-8')
        report = checks.scan(self.source)
        self.assertTrue(any(f['severity'] == 'high' for f in report['findings']))
        self.assertNotIn(secret, json.dumps(report))

    def test_missing_catalog_entry_is_detected(self):
        catalog = {'items': [{'name': 'Missing', 'type': 'tool', 'url': 'missing/', 'date': '2026-01-01'}]}
        (self.source / 'catalog.json').write_text(json.dumps(catalog), encoding='utf-8')
        self.assertTrue(any(f['check'] == 'catalog' for f in checks.scan(self.source)['findings']))

    def test_report_path_rejected_inside_source_and_any_checkout(self):
        (self.base / '.git').mkdir()
        for path in [self.source / 'report.json', self.base / 'elsewhere' / 'report.json']:
            with self.assertRaises(ValueError):
                bot.external_path(path, self.source)

    def test_report_permissions_are_private(self):
        output = self.base / 'report.json'
        bot.atomic_json(output, {'status': 'test'})
        self.assertEqual(output.stat().st_mode & 0o777, 0o600)

    def test_watcher_saves_private_plain_language_report_with_skips(self):
        state = self.base / 'reports-state'
        report = bot.collect(self.source, revision='test-revision')
        bot.save_report(state, report)
        plain = state / 'reports' / 'latest.txt'
        text = plain.read_text(encoding='utf-8')
        self.assertIn('YorpHives website review', text)
        self.assertIn('test-revision', text)
        self.assertIn('not run', text)
        self.assertIn('Skipped checks are listed above', text)
        self.assertEqual(plain.stat().st_mode & 0o777, 0o600)

    def test_sandbox_unavailable_does_not_run_tests_on_host(self):
        (self.source / 'tests').mkdir()
        (self.source / 'tests' / 'example.test.mjs').write_text('throw new Error("should not run")')
        with patch.object(sandbox.shutil, 'which', return_value=None), \
             patch.object(sandbox.subprocess, 'run') as execution:
            result = sandbox.run_sandboxed_tests(self.source)
        self.assertEqual(result['status'], 'not_run')
        execution.assert_not_called()

    def test_browser_without_configured_runtime_is_not_run(self):
        with patch.dict(os.environ, {'YH_PLAYWRIGHT_NODE_MODULES': '', 'YH_PLAYWRIGHT_BROWSERS': ''}), \
             patch.object(sandbox.subprocess, 'run') as execution:
            result = sandbox.run_sandboxed_browser(self.source)
        self.assertEqual(result['status'], 'not_run')
        execution.assert_not_called()

    def test_browser_sandbox_failure_never_runs_browser_on_host(self):
        modules = self.base / 'modules'
        (modules / 'playwright').mkdir(parents=True)
        (modules / 'playwright' / 'package.json').write_text('{"version":"1.62.1"}')
        browsers = self.base / 'browsers'
        browsers.mkdir()
        env = {'YH_PLAYWRIGHT_NODE_MODULES': str(modules), 'YH_PLAYWRIGHT_BROWSERS': str(browsers)}
        with patch.dict(os.environ, env), \
             patch.object(sandbox.subprocess, 'run', return_value=SimpleNamespace(returncode=1)) as execution:
            result = sandbox.run_sandboxed_browser(self.source)
        self.assertEqual(result['status'], 'not_run')
        self.assertEqual(execution.call_count, 1)
        command = execution.call_args.args[0]
        self.assertIn('--unshare-all', command)
        self.assertIn('--ro-bind', command)
        self.assertEqual(command[-1], '--version')

    def test_browser_failure_is_included_in_overall_review(self):
        failed = {'id': 'browser', 'status': 'failed', 'label': 'Website browser tests',
                  'details': 'A browser check failed.', 'cases': []}
        with patch.object(bot, 'run_sandboxed_browser', return_value=failed):
            report = bot.collect(self.source, include_browser=True)
        self.assertEqual(report['status'], 'attention')
        self.assertTrue(any(f['check'] == 'browser' for f in report['findings']))
        self.assertEqual(next(c for c in report['checks'] if c['id'] == 'browser')['status'], 'failed')

    def test_incomplete_browser_result_cannot_be_reported_as_passed(self):
        modules = self.base / 'modules'
        (modules / 'playwright').mkdir(parents=True)
        (modules / 'playwright' / 'package.json').write_text('{"version":"1.62.1"}')
        browsers = self.base / 'browsers'
        browsers.mkdir()
        env = {'YH_PLAYWRIGHT_NODE_MODULES': str(modules), 'YH_PLAYWRIGHT_BROWSERS': str(browsers)}
        fake = {'status': 'passed', 'cases': [{'name': 'Mobile navigation', 'status': 'passed'}] * 5}
        calls = [SimpleNamespace(returncode=0), SimpleNamespace(returncode=0, stdout=json.dumps(fake).encode())]
        with patch.dict(os.environ, env), patch.object(sandbox.subprocess, 'run', side_effect=calls):
            result = sandbox.run_sandboxed_browser(self.source)
        self.assertEqual(result['status'], 'not_run')

    def test_git_url_restrictions(self):
        bot.valid_repo('https://github.com/test/project.git')
        for url in ['file:///tmp/repo', 'https://github.com@evil.com/test/repo',
                    'https://token@github.com/test/repo', 'https://github.com/test/repo?x=1']:
            with self.subTest(url=url), self.assertRaises(ValueError):
                bot.valid_repo(url)

    def test_directory_watcher_detects_later_change(self):
        state = self.base / 'state'
        proc = subprocess.Popen([sys.executable, str(REVIEW / 'bot.py'), 'watch',
                                 '--root', str(self.source), '--state-dir', str(state),
                                 '--interval', '0.1'], stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, bufsize=1)
        try:
            selector = selectors.DefaultSelector()
            selector.register(proc.stdout, selectors.EVENT_READ)
            self.assertTrue(selector.select(10), 'First review did not finish')
            first = json.loads(proc.stdout.readline())
            (self.source / 'app.js').write_text('const updated = true;\n', encoding='utf-8')
            self.assertTrue(selector.select(10), 'Changed source was not reviewed')
            second = json.loads(proc.stdout.readline())
            self.assertNotEqual(first['revision'], second['revision'])
            self.assertEqual(json.loads((state / 'reports' / 'latest.json').read_text())['revision'],
                             second['revision'])
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
            proc.stdout.close()
            proc.stderr.close()

    def make_commit(self):
        run_git(self.source, 'init', '-q')
        run_git(self.source, 'add', '.')
        run_git(self.source, '-c', 'user.name=Reviewer test', '-c', 'user.email=reviewer@example.invalid',
                'commit', '-qm', 'fixture')
        return run_git(self.source, 'rev-parse', 'HEAD')

    def test_public_git_watcher_uses_snapshot_and_keeps_checkout_unchanged(self):
        commit = self.make_commit()
        before = bot.fingerprint(self.source)
        with patch.object(bot, 'fetch_commit', return_value=(self.source, commit)), \
             contextlib.redirect_stdout(io.StringIO()):
            ok = bot.watch_git('https://github.com/test/project.git', 'main',
                               self.base / 'remote-state', 1, False, once=True)
        self.assertTrue(ok)
        report = json.loads((self.base / 'remote-state' / 'reports' / 'latest.json').read_text())
        self.assertEqual(report['revision'], commit)
        self.assertEqual(before, bot.fingerprint(self.source))
        self.assertEqual(run_git(self.source, 'status', '--porcelain'), '')

    def test_failed_fetch_does_not_leave_a_stale_success_message(self):
        state = self.base / 'remote-state'
        with patch.object(bot, 'fetch_commit', side_effect=ValueError('offline')), \
             contextlib.redirect_stderr(io.StringIO()):
            ok = bot.watch_git('https://github.com/test/project.git', 'main', state, 1, False, once=True)
        self.assertFalse(ok)
        self.assertIn('Review unavailable', (state / 'reports' / 'latest.txt').read_text())
        self.assertFalse((state / 'reports' / 'latest.json').exists())

    def test_incomplete_or_modified_git_archives_are_refused(self):
        for attribute, extra in [('catalog.json export-ignore\n', None),
                                 ('marker.txt export-subst\n', '$Format:%H$\n')]:
            with self.subTest(attribute=attribute), tempfile.TemporaryDirectory() as temp:
                root = Path(temp) / 'repo'
                root.mkdir()
                fixture(root)
                (root / '.gitattributes').write_text(attribute)
                if extra is not None:
                    (root / 'marker.txt').write_text(extra)
                run_git(root, 'init', '-q')
                run_git(root, 'add', '.')
                run_git(root, '-c', 'user.name=Reviewer test', '-c', 'user.email=reviewer@example.invalid',
                        'commit', '-qm', 'fixture')
                commit = run_git(root, 'rev-parse', 'HEAD')
                target = Path(temp) / 'snapshot'
                target.mkdir()
                with self.assertRaises(ValueError):
                    bot.extract_snapshot(root, commit, target)

    def test_git_symlink_is_refused(self):
        (self.source / 'link').symlink_to('index.html')
        commit = self.make_commit()
        dest = self.base / 'snapshot'
        dest.mkdir()
        with self.assertRaises(ValueError):
            bot.extract_snapshot(self.source, commit, dest)


if __name__ == '__main__':
    unittest.main()
