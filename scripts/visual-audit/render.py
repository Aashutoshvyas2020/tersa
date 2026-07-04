from __future__ import annotations
from pathlib import Path
from typing import Any
from PIL import Image, ImageDraw, ImageFont

PALETTE = {
    'black': '#1b1f23', 'red': '#ff7b72', 'green': '#7ee787',
    'yellow': '#d29922', 'blue': '#58a6ff', 'magenta': '#bc8cff',
    'cyan': '#39c5cf', 'white': '#f0f6fc', 'brightblack': '#6e7681',
    'brightred': '#ffa198', 'brightgreen': '#aff5b4',
    'brightyellow': '#e3b341', 'brightblue': '#79c0ff',
    'brightmagenta': '#d2a8ff', 'brightcyan': '#56d4dd',
    'brightwhite': '#ffffff', 'default': '#e6edf3',
}
DEFAULT_BG = '#0d1117'
FONT_PATH = '/System/Library/Fonts/Menlo.ttc'
CJK_FONT_PATH = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
EMOJI_FONT_PATH = '/System/Library/Fonts/Apple Color Emoji.ttc'


def font_role(text: str) -> str:
    if not text:
        return 'mono'
    codepoint = ord(text[0])
    if 0x1F3FB <= codepoint <= 0x1F3FF:
        return 'emoji-modifier'
    if 0x1F000 <= codepoint <= 0x1FAFF:
        return 'emoji'
    if (
        0x3400 <= codepoint <= 0x4DBF
        or 0x4E00 <= codepoint <= 0x9FFF
        or 0xF900 <= codepoint <= 0xFAFF
    ):
        return 'cjk'
    return 'mono'


def _draw_color_emoji(
    image: Image.Image,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    cell_width: int,
    cell_height: int,
) -> None:
    layer = Image.new('RGBA', (48, 32), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((0, 0), text, font=font, embedded_color=True)
    bbox = layer.getbbox()
    if bbox is None:
        return
    glyph = layer.crop(bbox)
    glyph.thumbnail((cell_width * 2, cell_height), Image.Resampling.LANCZOS)
    px = x + max(0, (cell_width * 2 - glyph.width) // 2)
    py = y + max(0, (cell_height - glyph.height) // 2)
    image.paste(glyph, (px, py), glyph)


def _color(value: str | None, background: bool = False) -> str:
    if not value or value == 'default':
        return DEFAULT_BG if background else PALETTE['default']
    if value.startswith('#') and len(value) in {4, 7}:
        return value
    return PALETTE.get(value.lower(), DEFAULT_BG if background else PALETTE['default'])


def render_screen(screen: Any, output: Path, font_size: int = 14) -> None:
    font = ImageFont.truetype(FONT_PATH, font_size)
    try:
        bold_font = ImageFont.truetype(FONT_PATH, font_size, index=1)
    except OSError:
        bold_font = font
    try:
        cjk_font = ImageFont.truetype(CJK_FONT_PATH, font_size)
    except OSError:
        cjk_font = font
    try:
        emoji_font = ImageFont.truetype(EMOJI_FONT_PATH, 20)
    except OSError:
        emoji_font = None
    bbox = font.getbbox('M')
    cell_width = max(8, bbox[2] - bbox[0] + 1)
    cell_height = max(17, bbox[3] - bbox[1] + 5)
    image = Image.new('RGB', (screen.columns * cell_width, screen.lines * cell_height), DEFAULT_BG)
    draw = ImageDraw.Draw(image)

    for row in range(screen.lines):
        line = screen.buffer[row]
        for col in range(screen.columns):
            cell = line[col]
            x, y = col * cell_width, row * cell_height
            fg = _color(getattr(cell, 'fg', None))
            bg = _color(getattr(cell, 'bg', None), True)
            if getattr(cell, 'reverse', False):
                fg, bg = bg, fg
            if bg != DEFAULT_BG:
                draw.rectangle((x, y, x + cell_width, y + cell_height), fill=bg)
            char = cell.data
            if char and char != ' ':
                role = font_role(char)
                if role == 'emoji-modifier':
                    continue
                if role == 'emoji' and emoji_font is not None:
                    _draw_color_emoji(
                        image,
                        x,
                        y,
                        char,
                        emoji_font,
                        cell_width,
                        cell_height,
                    )
                else:
                    chosen = (
                        cjk_font
                        if role == 'cjk'
                        else bold_font if getattr(cell, 'bold', False) else font
                    )
                    draw.text((x, y - 1), char, font=chosen, fill=fg)
                if getattr(cell, 'underscore', False):
                    draw.line((x, y + cell_height - 2, x + cell_width - 1, y + cell_height - 2), fill=fg)

    cursor = getattr(screen, 'cursor', None)
    if cursor is not None and not getattr(cursor, 'hidden', False):
        x = min(max(cursor.x, 0), screen.columns - 1) * cell_width
        y = min(max(cursor.y, 0), screen.lines - 1) * cell_height
        draw.rectangle((x, y + cell_height - 3, x + cell_width - 1, y + cell_height - 1), fill='#f0f6fc')

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format='PNG', optimize=True)
