from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Menlo.ttc"
BG = "#111418"
FG = "#f0f6fc"
MUTED = "#8b949e"


def label_font(size: int = 18) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


def scenario_sheet(scenario_dir: Path, output_dir: Path) -> Path | None:
    captures: list[tuple[str, Path]] = []
    for size_dir in sorted(scenario_dir.iterdir()):
        if not size_dir.is_dir():
            continue
        for image_path in sorted(size_dir.glob("*.png")):
            captures.append((f"{size_dir.name} · {image_path.stem}", image_path))
    if not captures:
        return None

    tile_w, tile_h, label_h = 520, 460, 34
    columns = 3
    rows = (len(captures) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_w, 64 + rows * (tile_h + label_h)), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 16), scenario_dir.name, font=label_font(28), fill=FG)
    for index, (label, path) in enumerate(captures):
        col, row = index % columns, index // columns
        x, y = col * tile_w, 64 + row * (tile_h + label_h)
        image = fit(Image.open(path).convert("RGB"), tile_w - 20, tile_h - 20)
        px = x + (tile_w - image.width) // 2
        py = y + (tile_h - image.height) // 2
        sheet.paste(image, (px, py))
        draw.rectangle((x, y, x + tile_w - 1, y + tile_h + label_h - 1), outline="#30363d", width=1)
        draw.text((x + 10, y + tile_h + 7), label, font=label_font(15), fill=MUTED)

    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"{scenario_dir.name}.jpg"
    sheet.save(output, quality=88, optimize=True)
    return output


def overview(captures_dir: Path, output_dir: Path) -> list[Path]:
    items: list[tuple[str, Path]] = []
    for scenario in sorted(path for path in captures_dir.iterdir() if path.is_dir()):
        candidates = sorted(scenario.glob("80x34/*.png"))
        if not candidates:
            candidates = sorted(scenario.glob("*/*.png"))
        if candidates:
            items.append((scenario.name, candidates[-1]))

    page_size = 12
    outputs: list[Path] = []
    for page_index in range(0, len(items), page_size):
        page_items = items[page_index:page_index + page_size]
        tile_w, tile_h, label_h = 420, 360, 32
        columns = 3
        rows = (len(page_items) + columns - 1) // columns
        sheet = Image.new("RGB", (columns * tile_w, 58 + rows * (tile_h + label_h)), BG)
        draw = ImageDraw.Draw(sheet)
        draw.text((18, 14), f"Tersa visual audit overview {page_index // page_size + 1}", font=label_font(26), fill=FG)
        for index, (label, path) in enumerate(page_items):
            col, row = index % columns, index // columns
            x, y = col * tile_w, 58 + row * (tile_h + label_h)
            image = fit(Image.open(path).convert("RGB"), tile_w - 20, tile_h - 20)
            sheet.paste(image, (x + (tile_w - image.width) // 2, y + (tile_h - image.height) // 2))
            draw.rectangle((x, y, x + tile_w - 1, y + tile_h + label_h - 1), outline="#30363d", width=1)
            draw.text((x + 10, y + tile_h + 6), label, font=label_font(15), fill=MUTED)
        output = output_dir / f"overview-{page_index // page_size + 1:02d}.jpg"
        sheet.save(output, quality=88, optimize=True)
        outputs.append(output)
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--captures", type=Path, default=Path("artifacts/visual-audit/captures"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/visual-audit/contact-sheets"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    sheets = [scenario_sheet(path, args.output) for path in sorted(args.captures.iterdir()) if path.is_dir()]
    sheets = [path for path in sheets if path is not None]
    pages = overview(args.captures, args.output)
    print(f"Wrote {len(sheets)} scenario sheets and {len(pages)} overview pages")


if __name__ == "__main__":
    main()
