"""Head layers for the hero robot's attention motion (no head-turn pictures).

    python scripts/build-head-layers.py [--preview <out.png>]

Splits the head box of src/assets/hero/robot-agent.png (HEAD.box: the band above the collar seam,
robot-head.json) into layers that scripts/hero.ts composites on a canvas:

  helmet  the helmet alone (above its lower rim), with the two eye lights painted out of the visor,
          so the page can draw them as glows that glide toward the participant the robot attends to
  plate   what stays put: the neck and collar inside the box, with the neck continued a little way up
          under the rim, so a slightly tilted helmet never uncovers a gap
  shadow  the photo's own drop shadow inside the head's hole (the photo's CSS shadow is masked out
          there with its head), drawn behind the head

All come from the one existing image (no new art). Writes, in src/assets/hero/:
  robot-head-layers.webp  the three layers stacked (helmet, plate, shadow), LAYER_SCALE of the art's size
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

# The helmet's lower rim (art px, robot-agent.png): the lower edge of the visor's frame, from the
# helmet's left side, under the chin and up its right side to where it meets the background. Traced at
# 8x zoom, hugging the frame: neck left on the helmet would travel with it when the head turns and show a
# step at the neck's edge. Left of the neck (x < 307) it runs down to just above the shoulder.
RIM = [
    (220, 388),
    (300, 388),
    (307, 325),
    (318, 333),
    (328, 340),
    (338, 348),
    (348, 358),
    (358, 368),
    (368, 376),
    (380, 383),
    (400, 386),
    (420, 386),
    (440, 381),
    (455, 373),
    (468, 360),
    (476, 352),
    (490, 344),
    (500, 337),
    (512, 320),
    (520, 300),
    (600, 300),
]
# The helmet tilts about the neck joint, under the middle of the chin (art px).
PIVOT = (406, 388)
# How far up (art px) the plate continues the neck under the rim; more than the helmet ever lifts.
NECK_REACH = 16
# Rows (art px) under the traced rim that still hold the frame's anti-aliased edge. The helmet takes them
# along (the split runs this much lower), so the plate below is pure neck: a turned helmet never uncovers a
# second, static copy of its edge.
RIM_EDGE = 3
# The columns (art px) where the neck runs under the rim. Either side the helmet overhangs the
# background and the shoulders, which must not be continued upward.
NECK_COLUMNS = (314, 492)

# The eye lights (art px): centre, and the half-size of the patch painted out around each (its glow
# included). The head faces front: both lights are round and level.
EYES = [
    {"x": 363.9, "y": 202.9, "hole": (32, 34)},
    {"x": 448.4, "y": 203.6, "hole": (32, 34)},
]
# Radius (art px) of an eye light's glow, halo included; the page draws it as a radial gradient.
GLOW = 32
# Over this distance (art px, ~4 CSS px) the head canvas's share of the charge fill fades out toward
# the head box's sides and bottom, and the body's CSS fill fades in (scripts/build-images.mjs).
CHARGE_FEATHER = 10
# The page turns the helmet (its face slides around the outline); the turn fades out over these rows
# (art px) toward the chin, so the chin stays square on the neck.
TURN_FADE = (300, 370)
# The helmet tilts about the chin's corner on the side it turns away from (so that side never lifts off
# the neck): the corners' distance (art px) from PIVOT.
PIVOT_SWING = 80
# The photo's CSS drop shadow (AgentFlow.astro, .flow__robot-img: offset y, blur radius in CSS px of the
# 343 px wide robot, opacity), and the photo's hole's inset from the head box's sides and bottom
# (HEAD.hole in hero-flow.ts), in the same px.
CSS_SHADOW = (26, 40, 0.55)
HOLE_INSET = 2
ROBOT_CSS_WIDTH = 343
# The visor (art px): its middle (between the lights), and the distances from it over which a light
# gliding sideways narrows, as the glass curves away (from where the lights sit, to near the frame).
VISOR = {"centre": (EYES[0]["x"] + EYES[1]["x"]) / 2, "inner": (EYES[1]["x"] - EYES[0]["x"]) / 2, "outer": 76}


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
    rim = np.interp(xs, [p[0] for p in RIM], [p[1] for p in RIM]).astype(np.float32) + RIM_EDGE
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

    # The drop shadow (blur radius = 2 sigma), black, inside the hole only.
    css = art.shape[1] / ROBOT_CSS_WIDTH
    offset, blur, opacity = CSS_SHADOW
    shifted = np.zeros_like(alpha)
    dy = round(offset * css)
    shifted[dy:] = alpha[:-dy]
    shade = cv2.GaussianBlur(shifted, (0, 0), blur / 2 * css) * opacity
    inset = round(HOLE_INSET * css)
    hole = np.zeros_like(alpha)
    hole[: bh - inset, x0 + inset : x0 + bw - inset] = 1.0
    shadow = np.zeros_like(art)
    shadow[..., 3] = shade * hole

    def tile(layer):
        box = layer[:bh, x0 : x0 + bw].copy()
        # Premultiply before resizing so transparent pixels don't bleed their colour into edges.
        box[..., :3] *= box[..., 3:4]
        size = (round(bw * LAYER_SCALE), round(bh * LAYER_SCALE))
        small = cv2.resize(box, size, interpolation=cv2.INTER_AREA)
        a = small[..., 3:4]
        small[..., :3] = np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0.0)
        return small

    tiles = [tile(helmet), tile(plate), tile(shadow)]
    sheet = np.clip(np.concatenate(tiles, axis=0) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    cv2.imwrite(str(HERO / "robot-head-layers.webp"), sheet, [cv2.IMWRITE_WEBP_QUALITY, 90])

    frac = lambda v, size: round(v / size, 5)  # noqa: E731
    meta = {
        "tileWidth": tiles[0].shape[1],
        "tileHeight": tiles[0].shape[0],
        "pivot": [frac(PIVOT[0] - x0, bw), frac(PIVOT[1], bh)],
        "eyes": [[frac(e["x"] - x0, bw), frac(e["y"], bh)] for e in EYES],
        "glow": frac(GLOW, bw),
        "chargeFeather": frac(CHARGE_FEATHER, bw),
        "turnFade": [frac(v, bh) for v in TURN_FADE],
        "pivotSwing": frac(PIVOT_SWING, bw),
        "visor": [frac(VISOR["centre"] - x0, bw), frac(VISOR["inner"], bw), frac(VISOR["outer"], bw)],
        "shadow": list(CSS_SHADOW),
    }
    # Lists of numbers on one line, as the repo's formatter (prettier) writes them.
    text = re.sub(
        r"\[\s*(-?[\d.]+(?:,\s*-?[\d.]+)*)\s*\]",
        lambda m: "[" + ", ".join(re.split(r",\s*", m.group(1))) + "]",
        json.dumps(meta, indent=2),
    )
    (HERO / "robot-head-layers.json").write_text(text + "\n", newline="\n")
    print(f"robot-head-layers.webp {tiles[0].shape[1]}x{tiles[0].shape[0]} x{len(tiles)}", meta)

    if preview:
        bg = np.zeros((bh, bw * 3, 3), np.float32) + np.array([0.16, 0.1, 0.08], np.float32)
        for i, layer in enumerate([art, helmet, plate]):
            box = layer[:bh, x0 : x0 + bw]
            seg = bg[:, i * bw : (i + 1) * bw]
            seg[:] = box[..., :3] * box[..., 3:4] + seg * (1 - box[..., 3:4])
        cv2.imwrite(preview, np.clip(bg * 255, 0, 255).astype(np.uint8))


if __name__ == "__main__":
    main()
