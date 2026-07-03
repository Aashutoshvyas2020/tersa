from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image

CAPTURES = Path('artifacts/visual-audit/captures')
OUTPUT_JSON = Path('artifacts/visual-audit/findings.json')
OUTPUT_MD = Path('artifacts/visual-audit/AUTOMATED-REVIEW.md')
BACKGROUND = (13, 17, 23)
EXPECTED_WIDTHS = {60, 80, 120}


def luminance(rgb: tuple[int, int, int]) -> float:
    values = []
    for channel in rgb:
        value = channel / 255
        values.append(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    light, dark = sorted((luminance(a), luminance(b)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


def finding(path: Path, severity: str, code: str, message: str, **details: Any) -> dict[str, Any]:
    return {'path': str(path), 'severity': severity, 'code': code, 'message': message, 'details': details}


def inspect_text(path: Path, width: int, rows: int) -> list[dict[str, Any]]:
    text = path.read_text(encoding='utf-8', errors='replace')
    lines = text.splitlines()
    results: list[dict[str, Any]] = []
    if len(lines) != rows:
        results.append(finding(path, 'P1', 'row-count', f'Expected {rows} rows, found {len(lines)}'))
    if '�' in text:
        results.append(finding(path, 'P1', 'replacement-character', 'Rendered text contains Unicode replacement characters'))
    if re.search(r'\x1b|\[[0-9;?]*[A-Za-z]', text):
        results.append(finding(path, 'P1', 'ansi-leak', 'Rendered frame contains raw terminal control text'))
    bad_tokens = [token for token in ('[object Object]', 'undefined', 'NaN', 'Traceback', 'UnhandledPromiseRejection') if token in text]
    if bad_tokens:
        results.append(finding(path, 'P1', 'debug-token', 'Rendered frame contains internal/debug text', tokens=bad_tokens))
    nonempty = [line for line in lines if line.strip()]
    if not nonempty:
        results.append(finding(path, 'P1', 'blank-frame', 'Rendered checkpoint is completely blank'))
        return results

    edge_rows: list[int] = []
    for index, line in enumerate(lines):
        if len(line) > width:
            results.append(finding(path, 'P1', 'text-overflow', f'Row {index + 1} exceeds terminal width', length=len(line), width=width))
        padded = line.ljust(width)
        if padded and padded[-1] not in ' ─│┐┘┤┬┴┼╮╯╗╝║═':
            edge_rows.append(index + 1)
    if edge_rows:
        results.append(finding(path, 'P2', 'right-edge-content', 'Non-border content reaches the final terminal column', rows=edge_rows[:20]))
    if lines and lines[-1].strip():
        results.append(finding(path, 'P2', 'bottom-edge-content', 'Content reaches the final terminal row', content=lines[-1].rstrip()))

    duplicates: list[tuple[int, str]] = []
    for index in range(1, len(lines)):
        current = lines[index].strip()
        previous = lines[index - 1].strip()
        if current and current == previous and len(current) > 3 and not set(current) <= set('─═│ '):
            duplicates.append((index + 1, current))
    if duplicates:
        results.append(finding(path, 'P2', 'duplicate-row', 'Adjacent rendered rows are duplicated', rows=duplicates[:10]))
    match = re.search(r'\b(error|failed|failure|not found|unknown command|missing)\b', text, re.IGNORECASE)
    if match:
        results.append(finding(path, 'INFO', 'error-state', 'Checkpoint displays an error or unavailable state', match=match.group(0)))
    return results


def inspect_image(path: Path) -> list[dict[str, Any]]:
    image = Image.open(path).convert('RGB')
    results: list[dict[str, Any]] = []
    colors = Counter(image.getdata())
    non_bg = sum(count for color, count in colors.items() if color != BACKGROUND)
    if non_bg == 0:
        return [finding(path, 'P1', 'blank-image', 'PNG contains only the background color')]
    low = []
    for color, count in colors.most_common(30):
        if color == BACKGROUND or count < 10:
            continue
        ratio = contrast(color, BACKGROUND)
        if ratio < 3.0:
            low.append({'color': color, 'pixels': count, 'ratio': round(ratio, 2)})
    if low:
        results.append(finding(path, 'P2', 'low-contrast', 'Frequent foreground colors fall below 3:1 contrast', colors=low))
    pixels = image.load()
    width, height = image.size
    edge_non_bg = sum(int(pixels[x, 0] != BACKGROUND) + int(pixels[x, height - 1] != BACKGROUND) for x in range(width))
    edge_non_bg += sum(int(pixels[0, y] != BACKGROUND) + int(pixels[width - 1, y] != BACKGROUND) for y in range(height))
    if edge_non_bg:
        results.append(finding(path, 'P2', 'pixel-edge-contact', 'Rendered foreground touches the image boundary', pixels=edge_non_bg))
    return results


def main() -> None:
    findings: list[dict[str, Any]] = []
    scenario_widths: dict[str, set[int]] = defaultdict(set)
    png_count = 0
    text_count = 0
    for scenario_dir in sorted(path for path in CAPTURES.iterdir() if path.is_dir()):
        for size_dir in sorted(path for path in scenario_dir.iterdir() if path.is_dir()):
            match = re.fullmatch(r'(\d+)x(\d+)', size_dir.name)
            if not match:
                continue
            width, rows = map(int, match.groups())
            scenario_widths[scenario_dir.name].add(width)
            for path in sorted(size_dir.glob('*.txt')):
                text_count += 1
                findings.extend(inspect_text(path, width, rows))
            for path in sorted(size_dir.glob('*.png')):
                png_count += 1
                findings.extend(inspect_image(path))

    for scenario, widths in sorted(scenario_widths.items()):
        missing = sorted(EXPECTED_WIDTHS - widths)
        if missing:
            findings.append({
                'path': f'artifacts/visual-audit/captures/{scenario}',
                'severity': 'P1',
                'code': 'missing-width',
                'message': 'Scenario is missing required responsive widths',
                'details': {'missing': missing, 'present': sorted(widths)},
            })

    summary = Counter(item['severity'] for item in findings)
    payload = {
        'pngCount': png_count,
        'textFrameCount': text_count,
        'scenarioCount': len(scenario_widths),
        'summary': dict(summary),
        'findings': findings,
    }
    OUTPUT_JSON.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')

    lines = [
        '# Automated Visual Audit Review', '',
        f'- Scenarios: {len(scenario_widths)}',
        f'- PNGs: {png_count}',
        f'- Text frames: {text_count}',
        f'- Findings: {len(findings)}',
        f'- Severity counts: {dict(summary)}', '',
    ]
    for severity in ('P1', 'P2', 'P3', 'INFO'):
        subset = [item for item in findings if item['severity'] == severity]
        if not subset:
            continue
        lines.extend([f'## {severity}', ''])
        for item in subset:
            lines.append(f"- `{item['code']}` — `{item['path']}` — {item['message']}")
        lines.append('')
    OUTPUT_MD.write_text('\n'.join(lines), encoding='utf-8')
    print(json.dumps(payload['summary'], sort_keys=True))
    print(f'Reviewed {png_count} PNGs and {text_count} text frames across {len(scenario_widths)} scenarios')


if __name__ == '__main__':
    main()
