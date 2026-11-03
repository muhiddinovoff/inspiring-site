"""
Cuts the admitted students out of their result posters and lines them up for the hero, one layer per child.

    pip install "rembg[cpu]" pillow numpy scipy
    npm run cutout

Reads assets/hero/posters/<name>.* (the posters as published, not shipped with the site; left untouched) and writes:
- public/hero/cutouts/kid-<n>-<w>.webp    one cropped layer per child, 1000 and 2000 px wide canvases
- src/data/hero-cutouts.ts                where each layer sits on the canvas, in percent

Every child is scaled to the same head width and stands on one curve: the middle of the row a little higher, the
edges lower, as in a group photo. Pass a folder as the first argument to keep the cut-outs there and reuse them on
the next run (the background removal is the slow part).
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
POSTERS = ROOT / "assets/hero/posters"
OUT = ROOT / "public/hero/cutouts"
MANIFEST = ROOT / "src/data/hero-cutouts.ts"
MODEL = "birefnet-portrait"
WIDTHS = [1000, 2000]

# Left to right. The box is the child on the poster: above the name plate, clear of the score and the logos.
# The posters end at different heights; the children photographed furthest down stand in the middle, where the row
# is highest.
ROW = [
    ("samira", (470, 120, 1122, 1030)),
    ("mirhabib", (420, 160, 1054, 1165)),
    ("muhammadiso", (320, 130, 904, 1050)),
    ("xamid", (340, 130, 904, 1055)),
    ("zuhriddin", (340, 120, 904, 1025)),
    ("shahinabonu", (530, 100, 1122, 1110)),
    ("azizbek", (480, 100, 1122, 1030)),
    ("imron", (370, 230, 941, 1175)),
    ("nurmuhammad", (370, 230, 941, 1175)),
    ("xondamir", (370, 230, 941, 1175)),
]

# The canvas the layers are placed on (same shape as the hero stage expects).
W, H = 2000, 884
HEAD = 165  # head width on the canvas, px
MARGIN = 130  # centre of the outer heads from the canvas edge
TOP_MIDDLE, TOP_EDGE = 262, 345  # top of the heads in the middle of the row and on its ends
LIFT = 40  # how far a layer may end above the canvas bottom: the hero's bottom fade hides that much


def cut_out(name: str, box: tuple[int, int, int, int], cache: Path | None) -> np.ndarray:
    """The child alone on a transparent background, at poster resolution."""
    cached = cache / f"{name}.png" if cache else None
    if cached and cached.exists():
        return np.asarray(Image.open(cached).convert("RGBA")).copy()
    from rembg import new_session, remove

    global SESSION
    if "SESSION" not in globals():
        SESSION = new_session(MODEL)
    poster = Image.open(next(POSTERS.glob(name + ".*"))).convert("RGB").crop(box)
    rgba = np.asarray(remove(poster, session=SESSION)).copy()
    # Keep only what stands on the bottom edge: the child. Logos and score digits float free and are dropped.
    a = rgba[..., 3]
    labels, _ = ndimage.label(a > 20)
    keep = np.isin(labels, list(set(np.unique(labels[-3:])) - {0}))
    rgba[..., 3] = np.where(ndimage.binary_dilation(keep, iterations=3), a, 0)
    if cached:
        cache.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba).save(cached)
    return rgba


def despill(rgba: np.ndarray) -> np.ndarray:
    """The posters' green shows through along the cut edges (hair, shoulders): there green may be no stronger than
    the brighter of red and blue. Elsewhere only clearly green pixels are touched (nothing on the children is green)."""
    a = Image.fromarray(rgba[..., 3])
    edge = np.asarray(a.filter(ImageFilter.MaxFilter(9))) > 0
    edge &= np.asarray(a.filter(ImageFilter.MinFilter(9))) < 250
    r, g, b = (rgba[..., c].astype(np.int16) for c in range(3))
    cap = np.maximum(r, b) + 4
    green = (g > cap) & (edge | (g > np.maximum(r, b) + 24))
    rgba[..., 1] = np.where(green, cap, g).clip(0, 255).astype(np.uint8)
    return rgba


def head(rgba: np.ndarray) -> tuple[int, float, float]:
    """Top row of the head, its width and the x of its centre, from the silhouette: the head is everything above the
    neck, the narrowest row before the shoulders spread out."""
    solid = rgba[..., 3] > 128
    widths = solid.sum(1)
    top = int(np.argmax(widths > 8))
    probe = widths[top : top + int(len(widths) * 0.55)]
    neck = top + 60 + int(np.argmin(probe[60:]))
    rows = solid[top:neck]
    width = float(np.percentile(rows.sum(1), 90))
    cols = np.nonzero(rows.any(0))[0]
    xs = np.nonzero(rows)[1]
    return top, width, float(xs.mean()) if len(xs) else float(cols.mean())


def main() -> None:
    cache = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    OUT.mkdir(parents=True, exist_ok=True)
    n = len(ROW)
    layers = []
    for i, (name, box) in enumerate(ROW):
        rgba = despill(cut_out(name, box, cache))
        top, width, cx = head(rgba)
        k = HEAD / width
        h, w = rgba.shape[:2]
        # The middle of the row stands higher, on a gentle curve, unless the photo ends too soon for that.
        t = abs(i - (n - 1) / 2) / ((n - 1) / 2)
        want = TOP_MIDDLE + (TOP_EDGE - TOP_MIDDLE) * t**1.6
        y_top = max(want, H - LIFT - (h - top) * k)
        x_head = MARGIN + i * (W - 2 * MARGIN) / (n - 1)
        x0, y0 = x_head - cx * k, y_top - top * k
        layers.append((rgba, k, x0, y0))
        print(f"{name:12} head {width:5.0f}px  scale {k:.3f}  top {y_top:5.1f} (wanted {want:5.1f})")

    meta = []
    for i, (rgba, k, x0, y0) in enumerate(layers):
        h, w = rgba.shape[:2]
        crop = Image.fromarray(rgba)
        # Never past the canvas: what hangs below or beyond it is cut off.
        right, bottom = min(W, x0 + w * k), min(H, y0 + h * k)
        left = max(0.0, x0)
        src = (round((left - x0) / k), 0, round((right - x0) / k), round((bottom - y0) / k))
        crop = crop.crop(src)
        for target in WIDTHS:
            s = target / W
            size = (max(1, round((right - left) * s)), max(1, round((bottom - y0) * s)))
            out = crop.resize(size, Image.LANCZOS)
            # A light unsharp mask on the colour only: faces read crisp at large sizes; edges stay soft.
            rgb = out.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
            rgb.putalpha(out.getchannel("A"))
            rgb.save(OUT / f"kid-{i + 1}-{target}.webp", quality=90, method=6)
        meta.append(
            {
                "x": round(left / W * 100, 3),
                "y": round(y0 / H * 100, 3),
                "w": round((right - left) / W * 100, 3),
                "h": round((bottom - y0) / H * 100, 3),
            }
        )

    data = json.dumps({"width": W, "height": H, "sizes": WIDTHS, "kids": meta})
    MANIFEST.write_text(f"// Generated by `npm run cutout` (scripts/cutout.py). Do not edit by hand.\n\nexport const HERO_CUTOUTS = {data} as const\n")
    print(f"{len(meta)} layers written to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
