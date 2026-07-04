from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from visual_inspect import BACKGROUND, inspect_image, inspect_text


class InspectImageTests(unittest.TestCase):
    def test_ignores_antialias_intermediate_colors(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.png'
            image = Image.new('RGB', (20, 20), BACKGROUND)
            for x in range(4, 16):
                image.putpixel((x, 10), (230, 237, 243))
                image.putpixel((x, 11), (88, 93, 99))
            image.save(path)

            findings = inspect_image(path)

        self.assertNotIn('low-contrast', {item['code'] for item in findings})

    def test_flags_standalone_low_contrast_source_color(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.png'
            image = Image.new('RGB', (20, 20), BACKGROUND)
            for x in range(5, 15):
                for y in range(5, 15):
                    image.putpixel((x, y), (70, 75, 81))
            image.save(path)

            findings = inspect_image(path)

        self.assertIn('low-contrast', {item['code'] for item in findings})

    def test_ignores_incidental_edge_antialias_pixels(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.png'
            image = Image.new('RGB', (20, 20), BACKGROUND)
            image.putpixel((0, 0), (230, 237, 243))
            image.putpixel((19, 19), (230, 237, 243))
            image.save(path)

            findings = inspect_image(path)

        self.assertNotIn('pixel-edge-contact', {item['code'] for item in findings})

    def test_flags_material_boundary_contact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.png'
            image = Image.new('RGB', (20, 20), BACKGROUND)
            for y in range(20):
                image.putpixel((0, y), (230, 237, 243))
                image.putpixel((19, y), (230, 237, 243))
            image.save(path)

            findings = inspect_image(path)

        self.assertIn('pixel-edge-contact', {item['code'] for item in findings})


class InspectTextTests(unittest.TestCase):
    def test_does_not_treat_bracketed_ui_labels_as_ansi(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.txt'
            path.write_text('[on] [off] [x] [ELEVATED]'.ljust(40) + '\n', encoding='utf-8')

            findings = inspect_text(path, 40, 1)

        self.assertNotIn('ansi-leak', {item['code'] for item in findings})

    def test_reports_full_width_text_as_information_not_a_defect(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.txt'
            path.write_text('x' * 40 + '\n', encoding='utf-8')

            findings = inspect_text(path, 40, 1)

        full_width = [item for item in findings if item['code'] == 'full-width-text']
        self.assertEqual([item['severity'] for item in full_width], ['INFO'])

    def test_detects_literal_terminal_escape_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.txt'
            path.write_text('\x1b[31mred'.ljust(40) + '\n', encoding='utf-8')

            findings = inspect_text(path, 40, 1)

        self.assertIn('ansi-leak', {item['code'] for item in findings})


if __name__ == '__main__':
    unittest.main()
