from __future__ import annotations

import signal
import struct
import termios
import unittest
from unittest.mock import patch

from capture import (
    TerminalEmulatorDecoder,
    apply_terminal_resize,
    build_command_argv,
    execute_steps,
    wait_until,
)


class FakeSession:
    def __init__(self) -> None:
        self.events: list[str] = []

    def send(self, payload: bytes, label: str | None = None) -> None:
        self.events.append(f"send:{payload!r}")

    def wait_for(self, needle: str, timeout: float = 30.0) -> None:
        self.events.append(f"wait:{needle}")

    def pump(self, seconds: float) -> None:
        self.events.append(f"pump:{seconds}")

    def checkpoint(self, name: str) -> None:
        self.events.append(f"checkpoint:{name}")

    def wait_for_exit(self, timeout: float = 30.0) -> None:
        self.events.append(f"wait-exit:{timeout}")

    def assert_contains(self, needle: str) -> None:
        self.events.append(f"assert-contains:{needle}")

    def assert_not_contains(self, needle: str) -> None:
        self.events.append(f"assert-not-contains:{needle}")

    def assert_prompt_contains(self, needle: str) -> None:
        self.events.append(f"assert-prompt-contains:{needle}")

    def assert_prompt_not_contains(self, needle: str) -> None:
        self.events.append(f"assert-prompt-not-contains:{needle}")

    def resize(self, width: int, rows: int) -> None:
        self.events.append(f"resize:{width}x{rows}")


class TerminalResizeTests(unittest.TestCase):
    @patch('capture.os.killpg')
    @patch('capture.fcntl.ioctl')
    def test_updates_pty_size_and_notifies_process_group(
        self,
        ioctl,
        killpg,
    ) -> None:
        apply_terminal_resize(master=7, process_group=42, width=80, rows=34)

        ioctl.assert_called_once_with(
            7,
            termios.TIOCSWINSZ,
            struct.pack('HHHH', 34, 80, 0, 0),
        )
        killpg.assert_called_once_with(42, signal.SIGWINCH)


class WaitUntilTests(unittest.TestCase):
    def test_pumps_until_delayed_condition_becomes_true(self) -> None:
        class Session:
            pumps = 0

            def pump(self, _seconds: float) -> None:
                self.pumps += 1

        session = Session()

        self.assertTrue(
            wait_until(session, lambda: session.pumps >= 2, timeout=0.1, interval=0.01),
        )
        self.assertGreaterEqual(session.pumps, 2)


class TerminalEmulatorDecoderTests(unittest.TestCase):
    def test_strips_fragmented_kitty_keyboard_restore_sequence(self) -> None:
        decoder = TerminalEmulatorDecoder()

        self.assertEqual(decoder.feed(b'before\x1b[<'), 'before')
        self.assertEqual(decoder.feed(b'uafter'), 'after')

    def test_preserves_normal_terminal_sequences(self) -> None:
        decoder = TerminalEmulatorDecoder()

        self.assertEqual(decoder.feed(b'before\x1b[31mred'), 'before\x1b[31mred')


class BuildCommandArgvTests(unittest.TestCase):
    def test_parses_binary_without_shell_interpretation(self) -> None:
        self.assertEqual(
            build_command_argv("node dist/cli.mjs; touch /tmp/should-not-run"),
            [
                "node",
                "dist/cli.mjs;",
                "touch",
                "/tmp/should-not-run",
                "--model",
                "gpt-5.4-mini",
                "--effort",
                "high",
            ],
        )

    def test_preserves_quoted_executable_arguments(self) -> None:
        self.assertEqual(
            build_command_argv("node 'path with spaces/cli.mjs'"),
            [
                "node",
                "path with spaces/cli.mjs",
                "--model",
                "gpt-5.4-mini",
                "--effort",
                "high",
            ],
        )


class ExecuteStepsTests(unittest.TestCase):
    def test_sends_input_before_waiting_for_result_in_same_step(self) -> None:
        session = FakeSession()
        execute_steps(
            session,
            [{"send": b"/model\r", "wait_for": "Select", "checkpoint": "model"}],
        )
        self.assertEqual(
            session.events,
            [
                "send:b'/model\\r'",
                "wait:Select",
                "pump:0.5",
                "pump:0.2",
                "checkpoint:model",
            ],
        )

    def test_waits_for_process_exit_before_checkpointing_final_state(self) -> None:
        session = FakeSession()
        execute_steps(
            session,
            [{"send": b"/exit\r", "wait_for_exit": True, "checkpoint": "exit"}],
        )
        self.assertEqual(
            session.events,
            ["send:b'/exit\\r'", "wait-exit:30.0", "pump:0.2", "checkpoint:exit"],
        )

    def test_supports_assertions_resize_and_fragmented_input(self) -> None:
        session = FakeSession()
        execute_steps(
            session,
            [{
                "send_chunks": [b"\xe6", b"\xbc", b"\xa2"],
                "chunk_delay": 0.01,
                "resize": [100, 40],
                "assert_contains": "漢",
                "assert_not_contains": "�",
                "checkpoint": "unicode",
            }],
        )
        self.assertEqual(
            session.events,
            [
                "send:b'\\xe6'",
                "pump:0.01",
                "send:b'\\xbc'",
                "pump:0.01",
                "send:b'\\xa2'",
                "pump:0.01",
                "resize:100x40",
                "assert-contains:漢",
                "assert-not-contains:�",
                "pump:0.2",
                "checkpoint:unicode",
            ],
        )

    def test_supports_prompt_specific_assertions(self) -> None:
        session = FakeSession()
        execute_steps(
            session,
            [{
                "assert_prompt_contains": "history",
                "assert_prompt_not_contains": "old",
            }],
        )
        self.assertEqual(
            session.events,
            ["assert-prompt-contains:history", "assert-prompt-not-contains:old"],
        )


if __name__ == "__main__":
    unittest.main()
