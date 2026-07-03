from __future__ import annotations

import argparse
import codecs
import fcntl
import json
import os
import pty
import select
import shlex
import signal
import struct
import subprocess
import tempfile
import termios
import time
from pathlib import Path
from typing import Any

import pyte

from render import render_screen
from scenarios import CORE_SCENARIOS

SCENARIO_GROUPS = {
    'certified-dialogs': [
        'permissions',
        'status',
        'provider',
        'context',
        'request-size',
        'skills',
        'terminal-setup',
    ],
    'extended-core': ['config', 'theme', 'effort', 'plan', 'mcp', 'plugin', 'vim'],
}


def now_ms() -> int:
    return int(time.time() * 1000)


class AuditSession:
    def __init__(self, binary: str, width: int, rows: int, output_dir: Path, scenario: str):
        self.binary = binary
        self.width = width
        self.rows = rows
        self.output_dir = output_dir
        self.scenario = scenario
        self.screen = pyte.Screen(width, rows)
        self.stream = pyte.Stream(self.screen)
        self.decoder = codecs.getincrementaldecoder('utf-8')('replace')
        self.raw = bytearray()
        self.trace: list[dict[str, Any]] = []
        self._tail = b''
        self._query_replies: set[bytes] = set()
        self.config_dir = tempfile.TemporaryDirectory(prefix='tersa-visual-audit-')
        master, slave = pty.openpty()
        self.master = master
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', rows, width, 0, 0))
        env = os.environ.copy()
        env.update({
            'CLAUDE_CONFIG_DIR': self.config_dir.name,
            'CLAUDE_CODE_USE_OPENAI': env.get('CLAUDE_CODE_USE_OPENAI', '1'),
            'OPENAI_BASE_URL': 'https://opengateway.gitlawb.com/v1',
            'OPENAI_MODEL': 'gpt-5.4-mini',
            'OPENAI_API_KEY': 'tersa-visual-audit',
            'OPENGATEWAY_API_KEY': 'tersa-visual-audit',
            'TERSA_TUI_CANARY': '1',
            'TERSA_TUI_CANARY_PROVIDER': 'fixture',
            'TERSA_TUI_CANARY_EFFORT': 'high',
            'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC': '1',
            'COLUMNS': str(width),
            'LINES': str(rows),
            'TERM': 'xterm-256color',
            'COLORTERM': 'truecolor',
        })
        command = f"stty cols {width} rows {rows}; exec {binary} --model gpt-5.4-mini --effort high"
        self.process = subprocess.Popen(
            ['/bin/bash', '-lc', command],
            stdin=slave,
            stdout=slave,
            stderr=slave,
            cwd=Path(__file__).resolve().parents[2],
            env=env,
            start_new_session=True,
            close_fds=True,
        )
        os.close(slave)
        os.set_blocking(master, False)
        self.trace.append({'atMs': now_ms(), 'event': 'spawn', 'command': command, 'pid': self.process.pid})

    def _send_terminal_reply(self, payload: bytes, label: str) -> None:
        os.write(self.master, payload)
        self.trace.append({'atMs': now_ms(), 'event': 'terminal-reply', 'label': label, 'hex': payload.hex()})

    def _handle_queries(self, chunk: bytes) -> None:
        probe = self._tail + chunk
        for query, reply, label in [
            (b'\x1b[c', b'\x1b[?1;0c', 'primary-device-attributes'),
            (b'\x1b[>0q', b'\x1bP>|Ghostty 1.2.3\x1b\\', 'terminal-version'),
        ]:
            if query in probe and query not in self._query_replies:
                self._query_replies.add(query)
                self._send_terminal_reply(reply, label)
        self._tail = probe[-32:]

    def pump(self, seconds: float) -> None:
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            timeout = max(0.0, min(0.1, deadline - time.monotonic()))
            ready, _, _ = select.select([self.master], [], [], timeout)
            if not ready:
                continue
            try:
                chunk = os.read(self.master, 65536)
            except BlockingIOError:
                continue
            except OSError:
                break
            if not chunk:
                break
            self.raw.extend(chunk)
            self._handle_queries(chunk)
            text = self.decoder.decode(chunk)
            if text:
                self.stream.feed(text)

    def visible_text(self) -> str:
        return '\n'.join(self.screen.display)

    def wait_for(self, needle: str, timeout: float = 30.0) -> None:
        deadline = time.monotonic() + timeout
        target = needle.lower()
        while time.monotonic() < deadline:
            self.pump(0.15)
            if target in self.visible_text().lower():
                return
            if self.process.poll() is not None:
                raise RuntimeError(f'process exited while waiting for {needle!r}: {self.process.returncode}')
        raise TimeoutError(f'timed out waiting for {needle!r}\n\n{self.visible_text()}')

    def send(self, payload: bytes, label: str | None = None) -> None:
        os.write(self.master, payload)
        self.trace.append({
            'atMs': now_ms(),
            'event': 'input',
            'label': label or payload.decode('utf-8', 'backslashreplace'),
            'hex': payload.hex(),
        })

    def checkpoint(self, name: str) -> None:
        base = self.output_dir / self.scenario / f'{self.width}x{self.rows}'
        base.mkdir(parents=True, exist_ok=True)
        render_screen(self.screen, base / f'{name}.png')
        (base / f'{name}.txt').write_text(self.visible_text(), encoding='utf-8')
        self.trace.append({'atMs': now_ms(), 'event': 'checkpoint', 'name': name})

    def _wait_while_pumping(self, timeout: float) -> bool:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            self.pump(0.1)
            if self.process.poll() is not None:
                self.process.wait(timeout=0.1)
                return True
        return self.process.poll() is not None

    def close(self) -> int:
        self.pump(0.2)
        if self.process.poll() is None:
            try:
                self.send(b'\x03', 'ctrl-c')
                self.pump(0.3)
                self.send(b'\x03', 'ctrl-c')
                self.pump(0.3)
            except OSError:
                pass
        if self.process.poll() is None:
            try:
                self.process.terminate()
            except ProcessLookupError:
                pass
            if not self._wait_while_pumping(2.0):
                try:
                    self.process.kill()
                except ProcessLookupError:
                    pass
                if not self._wait_while_pumping(2.0):
                    raise RuntimeError(f'failed to stop audit CLI pid {self.process.pid}')
        self.pump(0.1)
        status = self.process.returncode if self.process.returncode is not None else -1
        base = self.output_dir / self.scenario / f'{self.width}x{self.rows}'
        base.mkdir(parents=True, exist_ok=True)
        (base / 'raw.ansi').write_bytes(bytes(self.raw))
        (base / 'trace.json').write_text(json.dumps({
            'scenario': self.scenario,
            'width': self.width,
            'rows': self.rows,
            'binary': self.binary,
            'exitCode': status,
            'events': self.trace,
        }, indent=2) + '\n', encoding='utf-8')
        os.close(self.master)
        self.config_dir.cleanup()
        return status


def execute_steps(session: Any, steps: list[dict[str, Any]]) -> None:
    for step in steps:
        if 'send' in step:
            session.send(step['send'], step.get('label'))
        if 'wait_for' in step:
            session.wait_for(str(step['wait_for']), float(step.get('timeout', 30.0)))
        if 'settle' in step:
            session.pump(float(step['settle']))
        if 'checkpoint' in step:
            session.pump(0.2)
            session.checkpoint(str(step['checkpoint']))


def run_scenario(binary: str, name: str, width: int, rows: int, output: Path) -> None:
    steps = CORE_SCENARIOS[name]
    session = AuditSession(binary, width, rows, output, name)
    error: Exception | None = None
    try:
        execute_steps(session, steps)
    except Exception as exc:
        error = exc
        session.checkpoint('failure')
    finally:
        status = session.close()
    if error is not None:
        raise error
    print(f'PASS {name} {width}x{rows} exit={status}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--binary', default='node dist/cli.mjs')
    parser.add_argument('--scenario', action='append', choices=sorted(CORE_SCENARIOS))
    parser.add_argument('--group', choices=sorted(SCENARIO_GROUPS))
    parser.add_argument('--width', action='append', type=int)
    parser.add_argument('--rows', type=int, default=34)
    parser.add_argument('--output', type=Path, default=Path('artifacts/visual-audit/captures'))
    parser.add_argument('--list', action='store_true')
    args = parser.parse_args()
    if args.list:
        print('\n'.join(sorted(CORE_SCENARIOS)))
        return
    scenarios = args.scenario or SCENARIO_GROUPS.get(args.group, list(CORE_SCENARIOS))
    widths = args.width or [60, 80, 120]
    for name in scenarios:
        for width in widths:
            run_scenario(args.binary, name, width, args.rows, args.output)


if __name__ == '__main__':
    main()
