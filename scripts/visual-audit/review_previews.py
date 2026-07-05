from pathlib import Path

from PIL import Image

source = Path("artifacts/visual-audit/contact-sheets")
output = Path("artifacts/visual-audit/review-previews")
output.mkdir(parents=True, exist_ok=True)

for name in ("overview-01.jpg", "overview-02.jpg"):
    image = Image.open(source / name).convert("RGB")
    image.thumbnail((1000, 1600), Image.Resampling.LANCZOS)
    destination = output / name
    image.save(destination, quality=62, optimize=True)
    print(name, image.size, destination.stat().st_size)
