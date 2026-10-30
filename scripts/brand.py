"""
Builds the web logos from the originals in assets/brand/ (left untouched):

    python3 scripts/brand.py      (needs: pip install pillow numpy)

- public/brand/logo[-vertical][-light].png   sized for the site; "-light" has a white wordmark for dark backgrounds
- public/brand/shield.png                     the emblem alone
- docs/assets/bot-avatar.png                  640x640 picture for the Telegram bot (set it in @BotFather)
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/brand"
OUT = ROOT / "public/brand"


def light(im: Image.Image) -> Image.Image:
    """Same logo with the dark teal wordmark turned white (the green shield and its white details stay)."""
    a = np.asarray(im.convert("RGBA")).copy()
    dark = a[..., :3].max(axis=2) < 150
    a[dark, :3] = 255
    return Image.fromarray(a)


def fit(im: Image.Image, width: int) -> Image.Image:
    im = im.crop(im.getbbox())
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    horizontal = Image.open(SRC / "logo-horizontal.png").convert("RGBA")
    vertical = Image.open(SRC / "logo-vertical.png").convert("RGBA")
    for name, im, width in [("logo", horizontal, 640), ("logo-vertical", vertical, 480)]:
        small = fit(im, width)
        small.save(OUT / f"{name}.png", optimize=True)
        light(small).save(OUT / f"{name}-light.png", optimize=True)

    # The emblem: the part of the vertical logo above the wordmark.
    a = np.asarray(vertical)
    rows = np.where(a[..., 3].max(axis=1) > 0)[0]
    gaps = np.where(np.diff(rows) > 20)[0]
    shield = vertical.crop((0, 0, vertical.width, rows[gaps[0]] + 1))
    shield = shield.crop(shield.getbbox())
    fit(shield, 256).save(OUT / "shield.png", optimize=True)

    # Bot avatar: the emblem on a soft mint disc that survives Telegram's round crop.
    size = 640
    avatar = Image.new("RGBA", (size, size), (236, 250, 243, 255))
    emblem = shield.copy()
    emblem.thumbnail((int(size * 0.5), int(size * 0.56)), Image.LANCZOS)
    avatar.alpha_composite(emblem, ((size - emblem.width) // 2, (size - emblem.height) // 2))
    avatar.convert("RGB").save(ROOT / "docs/assets/bot-avatar.png", optimize=True)
    print("brand assets written")


if __name__ == "__main__":
    main()
