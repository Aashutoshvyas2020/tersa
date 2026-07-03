from __future__ import annotations

import unittest

from capture import execute_steps


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


class ExecuteStepsTests(unittest.TestCase):
    def test_sends_input_before_waiting_for_result_in_same_step(self) -> None:
        session = FakeSession()
        execute_steps(
            session,
            [{"send": b"/model\r", "wait_for": "Select", "checkpoint": "model"}],
        )
        self.assertEqual(
            session.events,
            ["send:b'/model\\r'", "wait:Select", "pump:0.2", "checkpoint:model"],
        )


if __name__ == "__main__":
    unittest.main()
