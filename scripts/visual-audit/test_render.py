from __future__ import annotations

import unittest

from render import font_role


class FontFallbackTests(unittest.TestCase):
    def test_uses_cjk_fallback_for_han_characters(self) -> None:
        self.assertEqual(font_role('漢'), 'cjk')
        self.assertEqual(font_role('字'), 'cjk')

    def test_uses_color_emoji_fallback_for_emoji(self) -> None:
        self.assertEqual(font_role('\U0001F44B'), 'emoji')
        self.assertEqual(font_role('\U0001F3FD'), 'emoji-modifier')

    def test_keeps_terminal_symbols_in_monospace_font(self) -> None:
        self.assertEqual(font_role('❯'), 'mono')
        self.assertEqual(font_role('─'), 'mono')


if __name__ == '__main__':
    unittest.main()
