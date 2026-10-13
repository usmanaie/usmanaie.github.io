"""In-between frames for the hero robot's head turn (called by scripts/build-robot-head.mjs).

    python scripts/tween-head.py <dir>

<dir> holds key-0.png, key-1.png, ... (RGBA head bands, ordered left to right). Writes
frame-000.png, frame-001.png, ... (keys plus morphed in-betweens) and frames.json with the
frame index of every key.

Crossfading two head angles shows a double visor. Instead, each pair of neighbouring keys is
morphed along its optical flow (DIS): both keys are warped toward time t and blended, so the
visor slides rather than fades. The visor's reflections change between angles, which makes raw
flow tear, so the flow is computed on slightly blurred images and then smoothed inside the head
(normalised convolution), making the head move as one coherent shape. The number of in-betweens per pair follows how far the head
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
    frames: list[np.ndarray] = [keys[0]]
    key_index = [0]
    for a, b in zip(keys, keys[1:]):
        f_ab, f_ba = flow(a, b), flow(b, a)
        moving = (a[..., 3] > 0.5) | (b[..., 3] > 0.5)
        distance = float(np.percentile(np.linalg.norm(f_ab, axis=2)[moving], 90)) if moving.any() else 0.0
        steps = max(MIN_STEPS, round(distance / STEP_PX))
        for s in range(1, steps):
            t = s / steps
            frames.append((1 - t) * warp(a, f_ab, t) + t * warp(b, f_ba, 1 - t))
        frames.append(b)
        key_index.append(len(frames) - 1)
        print(f"pair {len(key_index) - 2}->{len(key_index) - 1}: motion {distance:.1f}px (p90), {steps} steps")
    for i, img in enumerate(frames):
        save(img, folder / f"frame-{i:03d}.png")
    (folder / "frames.json").write_text(json.dumps({"count": len(frames), "keys": key_index}))
    print(f"{len(frames)} frames, keys at {key_index}")


if __name__ == "__main__":
    main()
