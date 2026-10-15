"""Head layers for the hero robot's attention motion (no head-turn pictures).

    python scripts/build-head-layers.py [--preview <out.png>]

Splits the head box of src/assets/hero/robot-agent.png (HEAD.box: the band above the collar seam,
robot-head.json) into two layers that scripts/hero.ts composites on a canvas:

  helmet  the helmet alone (above its lower rim), with the two eye lights painted out of the visor,
          so the page can draw them as glows that glide toward the participant the robot attends to
  plate   what stays put: the neck and collar inside the box, with the neck continued a little way up
          under the rim, so a slightly tilted helmet never uncovers a gap

Both come from the one existing image (no new art). Writes, in src/assets/hero/:
  robot-head-layers.webp  the two layers stacked (helmet on top), LAYER_SCALE of the art's size
  robot-head-layers.json  their size, the tilt pivot and the eye lights, as fractions of the head box

Requires opencv-python-headless and numpy (build-time only).
"""

import json
import pathlib
import re
import sys

import cv2
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERO = ROOT / "src/assets/hero"

# Layer resolution relative to robot-agent.png (the robot is drawn ~250-343 CSS px wide; the
# photo's own srcset tops out at 720 px for the 822 px art).
LAYER_SCALE = 0.75

# The helmet's lower rim (art px, robot-agent.png): from under the chin on the left, along the chin
# and up the back of the helmet to where it meets the background on the right. Traced from the art and
# kept a pixel or two low: neck that moves with the helmet is invisible, helmet left on the plate is not.
RIM = [
    (220, 388),
    (300, 384),
    (320, 386),
    (340, 386),
    (360, 383),
    (380, 379),
    (400, 372),
    (420, 366),
    (440, 361),
    (448, 353),
    (455, 336),
    (462, 318),
    (470, 307),
    (480, 302),
    (490, 299),
    (500, 296),
    (600, 296),
]
# The helmet tilts about the neck joint, under the middle of the rim (art px).
PIVOT = (400, 380)
# How far up (art px) the plate continues the neck under the rim; more than the helmet ever lifts.
NECK_REACH = 16
# The columns (art px) where the neck runs under the rim. Left of it the chin overhangs the background
# and the shoulder, which must not be continued upward.
NECK_COLUMNS = (306, 494)

# The eye lights (art px): centre, and the half-size of the patch painted out around each (its glow
# included). The left light is foreshortened (narrow) and sits on the visor's blue reflection.
EYES = [
    {"x": 276.3, "y": 206.8, "hole": (18, 28)},
    {"x": 354.1, "y": 201.9, "hole": (32, 34)},
]
# Radius (art px) of an eye light's glow, halo included; the page draws it as a radial gradient.
GLOW = 32
# Across this span of the visor (art px, left to right) an eye light changes from the left one's look
# (narrow, whitish on the reflection) to the right one's (round, blue on the dark glass).
FORESHORTENED = (276.3, 330)


def load_art():
    img = cv2.imread(str(HERO / "robot-agent.png"), cv2.IMREAD_UNCHANGED)
    if img is None or img.shape[2] != 4:
        sys.exit("robot-agent.png: expected an RGBA image")
    return img.astype(np.float32) / 255.0


def head_box(art):
    meta = json.loads((HERO / "robot-head.json").read_text())
    height, width = art.shape[:2]
    x0 = round(meta["headLeft"] * width)
    w = round(meta["headWidth"] * width)
    h = round(meta["seam"] * height)
    return x0, w, h


def helmet_weight(width, height):
    """1 above the rim, 0 below, over a ~2 px soft edge (art px grid)."""
    xs = np.arange(width, dtype=np.float32)
    rim = np.interp(xs, [p[0] for p in RIM], [p[1] for p in RIM]).astype(np.float32)
    ys = np.arange(height, dtype=np.float32)[:, None]
    return np.clip((rim[None, :] - ys) / 2.0 + 0.5, 0.0, 1.0), rim


def paint_out_eyes(rgb):
    """Fills each eye light's patch column by column from the rows just above and below it.

    The visor's reflections run vertically, so this keeps their edges and continues them through
    the patch; a soft elliptical edge blends the fill into the untouched visor.
    """
    out = rgb.copy()
    for eye in EYES:
        cx, cy = eye["x"], eye["y"]
        hw, hh = eye["hole"]
        top, bottom = int(cy - hh) - 3, int(cy + hh) + 3
        above = rgb[top - 3 : top].mean(axis=0)
        below = rgb[bottom : bottom + 3].mean(axis=0)
        for y in range(top, bottom):
            t = (y - top + 0.5) / (bottom - top)
            fill = above * (1 - t) + below * t
            for x in range(int(cx - hw) - 2, int(cx + hw) + 3):
                d = ((x - cx) / hw) ** 2 + ((y - cy) / hh) ** 2
                w = float(np.clip((1.25 - d) / 0.5, 0.0, 1.0))
                if w > 0:
                    out[y, x] = out[y, x] * (1 - w) + fill[x] * w
    return out


def neck_plate(art, weight, rim):
    """The art below the rim, continued upward under it by mirroring the neck about the rim (shaded)."""
    height, width = weight.shape
    plate = art.copy()
    for x in range(width):
        r = int(round(rim[x]))
        if not NECK_COLUMNS[0] <= x <= NECK_COLUMNS[1]:
            plate[:r, x, 3] = 0.0
            continue
        for k in range(1, NECK_REACH + 1):
            y, src = r - k, min(height - 1, r + k)
            if y < 0:
                break
            shade = 1.0 - 0.45 * k / NECK_REACH
            plate[y, x, :3] = art[src, x, :3] * shade
            plate[y, x, 3] = art[src, x, 3] * (1.0 - (k / NECK_REACH) ** 4)
        plate[: max(0, r - NECK_REACH), x, 3] = 0.0
    return plate


def main():
    preview = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    art = load_art()
    x0, bw, bh = head_box(art)
    weight, rim = helmet_weight(art.shape[1], art.shape[0])
    alpha = art[..., 3]

    helmet = art.copy()
    helmet[..., :3] = paint_out_eyes(art[..., :3])
    helmet[..., 3] = alpha * weight

    plate = neck_plate(art, weight, rim)

    def tile(layer):
        box = layer[:bh, x0 : x0 + bw].copy()
        # Premultiply before resizing so transparent pixels don't bleed their colour into edges.
        box[..., :3] *= box[..., 3:4]
        size = (round(bw * LAYER_SCALE), round(bh * LAYER_SCALE))
        small = cv2.resize(box, size, interpolation=cv2.INTER_AREA)
        a = small[..., 3:4]
        small[..., :3] = np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0.0)
        return small

    tiles = [tile(helmet), tile(plate)]
    sheet = np.clip(np.concatenate(tiles, axis=0) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    cv2.imwrite(str(HERO / "robot-head-layers.webp"), sheet, [cv2.IMWRITE_WEBP_QUALITY, 90])

    frac = lambda v, size: round(v / size, 5)  # noqa: E731
    meta = {
        "tileWidth": tiles[0].shape[1],
        "tileHeight": tiles[0].shape[0],
        "pivot": [frac(PIVOT[0] - x0, bw), frac(PIVOT[1], bh)],
        "eyes": [[frac(e["x"] - x0, bw), frac(e["y"], bh)] for e in EYES],
        "glow": frac(GLOW, bw),
        "foreshortened": [frac(v - x0, bw) for v in FORESHORTENED],
    }
    # Number pairs on one line, as the repo's formatter (prettier) writes them.
    text = re.sub(r"\[\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]", r"[\1, \2]", json.dumps(meta, indent=2))
    (HERO / "robot-head-layers.json").write_text(text + "\n", newline="\n")
    print(f"robot-head-layers.webp {tiles[0].shape[1]}x{tiles[0].shape[0]} x2", meta)

    if preview:
        bg = np.zeros((bh, bw * 3, 3), np.float32) + np.array([0.16, 0.1, 0.08], np.float32)
        for i, layer in enumerate([art, helmet, plate]):
            box = layer[:bh, x0 : x0 + bw]
            seg = bg[:, i * bw : (i + 1) * bw]
            seg[:] = box[..., :3] * box[..., 3:4] + seg * (1 - box[..., 3:4])
        cv2.imwrite(preview, np.clip(bg * 255, 0, 255).astype(np.uint8))


if __name__ == "__main__":
    main()
