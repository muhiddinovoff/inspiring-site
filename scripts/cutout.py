"""
Cuts the admitted students out of their result posters for the hero, one portrait per child.

    pip install "rembg[cpu]" pillow numpy scipy
    npm run cutout

Reads assets/hero/posters/<name>.* (the posters as published, not shipped with the site; left untouched) and writes:
- public/hero/students/kid-<n>.webp    one portrait per child (n is the place in ROW), all the same frame
- src/data/hero-cutouts.ts             the frame's size

Every child is scaled to the same head width and placed the same way, so they can take turns in one spot.
Pass a folder as the first argument to keep the cut-outs there and reuse them on
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
OUT = ROOT / "public/hero/students"
MANIFEST = ROOT / "src/data/hero-cutouts.ts"
MODEL = "birefnet-portrait"

# The box is the child on the poster: above the name plate, clear of the score and the logos. The order gives the
# file numbers that src/data/hero-students.ts refers to.
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

# Every portrait's frame: the head this wide, its top this far down, centred. The posters end around the hips;
# the frame is cut where the shortest of them ends.
W, H = 640, 790
HEAD = 230
HEAD_TOP = 40


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


def to_ycc(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return np.stack(
        [0.299 * r + 0.587 * g + 0.114 * b, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b],
        -1,
    )


def from_ycc(ycc: np.ndarray) -> np.ndarray:
    y, cb, cr = ycc[..., 0], ycc[..., 1] - 128, ycc[..., 2] - 128
    return np.stack([y + 1.402 * cr, y - 0.344136 * cb - 0.714136 * cr, y + 1.772 * cb], -1)


def white_balance(rgba: np.ndarray) -> np.ndarray:
    """Every poster was graded differently. The white shirts should be white: whatever tint they carry comes off the
    whole child (gently, and never more than 10 % per channel)."""
    rgb = rgba[..., :3].astype(np.float32)
    ycc = to_ycc(rgb)
    shirt = (rgba[..., 3] > 250) & (ycc[..., 0] > 170) & (np.abs(ycc[..., 1] - 128) < 14) & (np.abs(ycc[..., 2] - 128) < 14)
    if shirt.sum() < 500:
        return rgba
    mean = rgb[shirt].mean(0)
    gain = np.clip(mean.mean() / mean, 0.9, 1.1) ** 0.8
    rgba[..., :3] = np.clip(rgb * gain, 0, 255).astype(np.uint8)
    return rgba


def skin(rgba: np.ndarray) -> np.ndarray:
    """A soft 0..1 mask of the skin (face, neck, hands), from the classic YCbCr skin range."""
    ycc = to_ycc(rgba[..., :3].astype(np.float32))
    y, cb, cr = ycc[..., 0], ycc[..., 1], ycc[..., 2]
    hard = (rgba[..., 3] > 200) & (y > 55) & (cb > 77) & (cb < 130) & (cr > 133) & (cr < 195)
    hard = ndimage.binary_opening(hard, iterations=2)
    # Whole patches, no holes: flushed cheeks, eyes and lips are corrected together with the skin around them, or the
    # change in tone would leave them as blotches.
    hard = ndimage.binary_fill_holes(ndimage.binary_closing(hard, iterations=8))
    return np.asarray(Image.fromarray((hard * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255


def retouch(rgba: np.ndarray, mask: np.ndarray, own: np.ndarray, target: np.ndarray) -> np.ndarray:
    """Brings this child's skin towards the group's tone and brightness, then smooths it lightly. Only the skin is
    touched: uniforms, hair, eyes and lips keep their own colour and texture."""
    rgb = rgba[..., :3].astype(np.float32)
    ycc = to_ycc(rgb)
    m = mask[..., None]
    gain = np.clip(target[0] / own[0], 0.88, 1.15) ** 0.75
    shift = (target[1:] - own[1:]) * 0.7
    tuned = ycc.copy()
    tuned[..., 0] *= gain
    tuned[..., 1:] += shift
    rgb = rgb + m * (from_ycc(tuned) - rgb)
    # Smoothing: a blur blended in only where the skin is even, so the eyes, brows and lips stay sharp.
    blur = np.asarray(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2)), np.float32)
    grad = np.asarray(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("L").filter(ImageFilter.FIND_EDGES), np.float32)
    even = np.clip(1 - grad / 40, 0, 1)[..., None]
    rgb = rgb + m * even * 0.4 * (blur - rgb)
    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    return rgba


def clean_edge(rgba: np.ndarray) -> np.ndarray:
    """Pulls the outline in by a pixel and softens it: no light fringe from the posters' glow around hair and shoulders."""
    a = Image.fromarray(rgba[..., 3]).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba[..., 3] = np.minimum(rgba[..., 3], np.asarray(a))
    return rgba


def main() -> None:
    cache = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    OUT.mkdir(parents=True, exist_ok=True)
    kids = [clean_edge(white_balance(despill(cut_out(name, box, cache)))) for name, box in ROW]
    masks = [skin(rgba) for rgba in kids]
    tones = []
    for rgba, mask in zip(kids, masks):
        ycc = to_ycc(rgba[..., :3].astype(np.float32))
        tones.append((ycc * mask[..., None]).sum((0, 1)) / mask.sum())
    # The group's tone: the median child, a touch brighter so faces read well on the dark photo.
    target = np.median(tones, 0) * np.array([1.04, 1, 1])
    for i, (name, box) in enumerate(ROW):
        rgba = retouch(kids[i], masks[i], tones[i], target)
        top, width, cx = head(rgba)
        k = HEAD / width
        h, w = rgba.shape[:2]
        img = Image.fromarray(rgba).resize((round(w * k), round(h * k)), Image.LANCZOS)
        # Same head size and place on every frame, so the portraits swap without the figure jumping.
        frame = Image.new("RGBA", (W, H))
        frame.alpha_composite(img, (round(W / 2 - cx * k), round(HEAD_TOP - top * k)))
        # A light unsharp mask on the colour only: faces read crisp at large sizes; edges stay soft.
        rgb = frame.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        rgb.putalpha(frame.getchannel("A"))
        rgb.save(OUT / f"kid-{i + 1}.webp", quality=90, method=6)
        reach = HEAD_TOP + (h - top) * k
        print(f"{name:12} head {width:5.0f}px  scale {k:.3f}  body to {reach:5.0f}px of {H}")

    MANIFEST.write_text(
        "// Generated by `npm run cutout` (scripts/cutout.py). Do not edit by hand.\n\n"
        f"export const HERO_CUTOUTS = {json.dumps({'width': W, 'height': H})} as const\n"
    )
    print(f"{len(ROW)} portraits written to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
