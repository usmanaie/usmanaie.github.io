"""In-between frames for the hero robot's head turn (called by scripts/build-robot-head.mjs).

    python scripts/tween-head.py <dir>

<dir> holds key-0.png, key-1.png, ... (RGBA head bands, ordered left to right) and optionally
landmarks.json (per key, the eye-light centres in band px). Writes
frame-000.png, frame-001.png, ... (keys plus morphed in-betweens) and frames.json with the
frame index of every key.

Crossfading two head angles shows a double visor. Instead, each pair of neighbouring keys is
morphed along its optical flow (DIS): both keys are warped toward time t and blended, so the
visor slides rather than fades. The visor's reflections change between angles, which makes raw
flow tear, so the flow is computed on slightly blurred images and then smoothed inside the head
(normalised convolution), making the head move as one coherent shape. The eyes move further
than the smoothed flow suggests, which showed as a double pair of eyes mid-turn, so where both
keys have two eye landmarks the flow around each eye is corrected to carry it to its partner. The number of in-betweens per pair follows how far the head
actually moves, so the turn runs at a steady speed when frames play at a fixed rate.

Requires opencv-python-headless and numpy (build-time only).
"""

import json
import pathlib
import sys

import cv2
import numpy as np

# Motion of the fastest-moving parts (90th percentile, px at the band's resolution) allowed
# between consecutive frames. The neck and shoulders barely move, so an average would understate it.
STEP_PX = 2.5
MIN_STEPS = 2
# Blur (px) before measuring flow, and smoothing (px) of the flow field inside the figure.
FLOW_BLUR = 3
FLOW_SMOOTH = 25
# Radius (px) over which an eye landmark's correction fades into the surrounding flow, and how
# far (px) a landmark is snapped to the nearest brightness peak.
EYE_SIGMA = 40
EYE_SNAP = 10
# Sharpened dissolve: the warped shapes move continuously, but each in-between takes nearly all of
# its pixels from the nearer key, handing over within a short window around the midpoint. A plain
# 50/50 blend shows both keys' visor edges and sheen at once, as faint streaks.
DISSOLVE_SHARPNESS = 3.0


def load(path: pathlib.Path) -> np.ndarray:
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0
    rgb, a = img[..., :3], img[..., 3:4]
    return np.concatenate([rgb * a, a], axis=2)  # premultiplied BGRA


def gray(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor((np.clip(img[..., :3], 0, 1) * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)


def flow(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(0)
    raw = dis.calc(cv2.GaussianBlur(gray(a), (0, 0), FLOW_BLUR), cv2.GaussianBlur(gray(b), (0, 0), FLOW_BLUR), None)
    # Smooth within the figure only, so the background's zero motion does not drag the edges.
    inside = (a[..., 3] > 0.5).astype(np.float32)
    weight = cv2.GaussianBlur(inside, (0, 0), FLOW_SMOOTH) + 1e-4
    return np.stack(
        [cv2.GaussianBlur(raw[..., i] * inside, (0, 0), FLOW_SMOOTH) / weight for i in range(2)], axis=2
    )


def snap(img: np.ndarray, points: list) -> list:
    """Moves each landmark to the brightest point (after a small blur) within EYE_SNAP px."""
    g = cv2.GaussianBlur(gray(img).astype(np.float32), (0, 0), 2)
    out = []
    for x, y in points:
        x0, y0 = max(0, int(x) - EYE_SNAP), max(0, int(y) - EYE_SNAP)
        win = g[y0 : int(y) + EYE_SNAP + 1, x0 : int(x) + EYE_SNAP + 1]
        dy, dx = np.unravel_index(int(np.argmax(win)), win.shape)
        out.append((x0 + dx, y0 + dy))
    return sorted(out)


def steer(f: np.ndarray, src: list, dst: list, t: float, forward: bool) -> np.ndarray:
    """
    Corrects flow `f` for the in-between at time `t` so each eye lands on its partner.

    Warping samples backward from where a pixel ends up, so the correction is centred on where
    each eye should be at time t (src + t * motion), not where it started.
    """
    if len(src) != 2 or len(dst) != 2:
        return f
    h, w = f.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    out = f.copy()
    for (sx, sy), (tx, ty) in zip(src, dst):
        motion = np.array([tx - sx, ty - sy], np.float32)
        cx, cy = sx + t * motion[0], sy + t * motion[1]
        want = motion if forward else -motion
        residual = want - f[int(round(cy)), int(round(cx))]
        weight = np.exp(-((gx - cx) ** 2 + (gy - cy) ** 2) / (2 * EYE_SIGMA**2))
        out += weight[..., None] * residual
    return out


def dissolve(t: float) -> float:
    """Blend weight of the second key at time t (0-1), steep around the midpoint."""
    x = min(1.0, max(0.0, (t - 0.5) * DISSOLVE_SHARPNESS + 0.5))
    return x * x * (3 - 2 * x)


def warp(img: np.ndarray, f: np.ndarray, t: float) -> np.ndarray:
    h, w = img.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, gx - t * f[..., 0], gy - t * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)


def save(img: np.ndarray, path: pathlib.Path) -> None:
    a = np.clip(img[..., 3:4], 0, 1)
    rgb = np.where(a > 1e-4, img[..., :3] / np.maximum(a, 1e-4), 0)
    out = np.concatenate([np.clip(rgb, 0, 1), a], axis=2)
    cv2.imwrite(str(path), (out * 255 + 0.5).astype(np.uint8))


def main() -> None:
    folder = pathlib.Path(sys.argv[1])
    keys = [load(p) for p in sorted(folder.glob("key-*.png"), key=lambda p: int(p.stem.split("-")[1]))]
    marks_file = folder / "landmarks.json"
    marks = json.loads(marks_file.read_text()) if marks_file.exists() else [[] for _ in keys]
    eyes = [snap(k, m) if len(m) == 2 else [] for k, m in zip(keys, marks)]
    frames: list[np.ndarray] = [keys[0]]
    key_index = [0]
    for i, (a, b) in enumerate(zip(keys, keys[1:])):
        f_ab, f_ba = flow(a, b), flow(b, a)
        moving = (a[..., 3] > 0.5) | (b[..., 3] > 0.5)
        distance = float(np.percentile(np.linalg.norm(f_ab, axis=2)[moving], 90)) if moving.any() else 0.0
        steps = max(MIN_STEPS, round(distance / STEP_PX))
        for s in range(1, steps):
            t = s / steps
            ab = steer(f_ab, eyes[i], eyes[i + 1], t, forward=True)
            ba = steer(f_ba, eyes[i], eyes[i + 1], t, forward=False)
            mix = dissolve(t)
            frames.append((1 - mix) * warp(a, ab, t) + mix * warp(b, ba, 1 - t))
        frames.append(b)
        key_index.append(len(frames) - 1)
        print(f"pair {len(key_index) - 2}->{len(key_index) - 1}: motion {distance:.1f}px (p90), {steps} steps")
    for i, img in enumerate(frames):
        save(img, folder / f"frame-{i:03d}.png")
    (folder / "frames.json").write_text(json.dumps({"count": len(frames), "keys": key_index}))
    print(f"{len(frames)} frames, keys at {key_index}")


if __name__ == "__main__":
    main()
