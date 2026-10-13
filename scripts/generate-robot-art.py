"""
Generates candidate hero robot artwork with Google's Gemini image model.

    python scripts/generate-robot-art.py --vertex-project <id> [--model pro|flash] [--only A,C]
    python scripts/generate-robot-art.py [--model pro|flash]          # Gemini API key instead

Vertex AI mode authenticates with the gcloud login (Application Default Credentials, or a
short-lived `gcloud auth print-access-token` token) and bills the given project.
API-key mode reads GEMINI_API_KEY from the environment or the git-ignored .env.local.
Credentials are never printed or written anywhere.
Candidates land in design-candidates/robot/ (git-ignored) for review; only approved art is
copied into src/assets/. The prompts below are the provenance record for that art.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "design-candidates" / "robot"

MODELS = {"pro": "gemini-3-pro-image", "flash": "gemini-3.1-flash-image"}

STYLE = (
    "Photorealistic premium 3D product render of a sleek humanoid AI agent robot. "
    "The entire body is visible from the top of the head to the soles of the feet, centred, with "
    "generous empty margin on all sides. Glossy pearl-white ceramic shell panels, matte graphite "
    "joints, slim athletic proportions. Cinematic rim lighting: electric blue (#2F6BFF) light from "
    "the left and crimson red (#FF3B4E) light from the right, soft blue glow from a small core in "
    "the chest. Isolated on a pure, flat, solid black background (#000000) with no floor, no "
    "reflection, no shadow on the ground. No text, no logos, no watermark. Sharp focus, studio "
    "quality, ultra-detailed."
)

CANDIDATES = {
    "A": "Smooth faceless helmet head with a dark glass visor showing two soft glowing eyes and a "
    "small circular light on the side of the head. Standing in a confident three-quarter pose, "
    "the right hand raised palm-up at chest height as if presenting a holographic workflow.",
    "B": "Elegant android with a refined, serene humanoid face sculpted in white ceramic and a "
    "glowing blue ring on the side of the head, exposed chrome neck cables. Standing in a "
    "three-quarter pose looking to the right, one hand gesturing outward.",
    "C": "Minimalist design language with seamless rounded panels, a glossy black oval face plate "
    "with two thin glowing eye lines. Standing upright facing the viewer, arms relaxed, a calm "
    "and trustworthy presence.",
    # Final hero art: candidate A, regenerated head-to-toe from the A draft as a reference image.
    "A-full": "Exactly the same robot as in the reference image (same white helmet with dark glass "
    "visor and two glowing eyes, circular light on the side of the head, white shell with graphite "
    "joints, glowing chest core, sculpted dark abdomen plates). Zoom out so the complete figure fits: "
    "full body from the top of the head down to both feet standing on the ground plane, nothing "
    "cropped, the feet fully visible with clear empty space below them. Same confident three-quarter "
    "pose with the right hand raised palm-up at chest height presenting something.",
    # Owner feedback: no hand raised in the air. Same robot, framing and feet as A-full; only the
    # arms change. Generated with A-full as the reference image.
    "A-rest": "Recreate the reference image exactly: the same robot, identical materials, lighting, "
    "colours, camera angle, scale and position in the frame, the head and visor exactly as in the "
    "reference, both feet in exactly the same place. Change only the arms: both arms hang relaxed "
    "and natural at the sides of the body, hands loose beside the thighs, nothing raised.",
    # Head-turn keys (owner request: the robot turns its head toward each step). Only the head of
    # each is used; scripts/build-robot-head.mjs puts it on the A-rest body and morphs in-betweens.
    # Exact angles were unreliable, so the prompts that worked describe what is visible.
    # head-L20 and head-F0: reference A-rest.
    "head-L20": "Recreate the reference image exactly: the same robot, identical materials, lighting, "
    "colours, camera angle, scale and position in the frame; the body, shoulders, both arms, hands, "
    "legs and feet stay exactly as in the reference. Change only the head and the top of the neck: "
    "the head is turned about 20 degrees toward the viewer's left.",
    "head-F0": "Recreate the reference image exactly: the same robot, identical materials, lighting, "
    "colours, camera angle, scale and position in the frame; the body, shoulders, both arms, hands, "
    "legs and feet stay exactly as in the reference. Change only the head and the top of the neck: "
    "the head faces the camera straight on, the visor looking directly at the viewer.",
    # head-RH: reference head-F0.
    "head-RH": "Recreate the reference image exactly: same robot, materials, lighting, camera, scale, "
    "position, body, arms, hands, legs and feet. Change only the head: it turns slightly toward the "
    "viewer's right, halfway between facing the camera and a three-quarter view, so the visor shifts a "
    "little to the right and the round light on the side of the helmet shows as a thin crescent at the "
    "left edge of the helmet.",
    # head-LH2: reference head-L20.
    "head-LH2": "Recreate the reference image exactly: same robot, materials, lighting, camera, scale, "
    "position, body, arms, hands, legs and feet. Change only the head: it turns back toward the "
    "camera, halfway between this three-quarter view and facing the camera straight on. It still "
    "faces slightly to the viewer's left, with the round side light still visible as a thin crescent "
    "at the right edge of the helmet.",
    "D": "Advanced engineering look: layered armour plates, visible precision joints and fine panel "
    "lines, a dark visor with two glowing eyes. Walking forward mid-stride in a dynamic "
    "three-quarter view, one arm extended toward the right.",
}


def load_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    env_file = ROOT / ".env.local"
    if not key and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "GEMINI_API_KEY":
                key = value.strip().strip("\"'")
    if not key:
        sys.exit("GEMINI_API_KEY not found (set the environment variable or add it to .env.local).")
    return key


def vertex_client(project: str, location: str):
    from google import genai

    try:
        import google.auth

        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    except Exception:  # no usable ADC: fall back to the gcloud CLI login
        import subprocess

        from google.oauth2.credentials import Credentials

        token = subprocess.run(
            ["gcloud", "auth", "print-access-token"], capture_output=True, text=True, check=True, shell=os.name == "nt"
        ).stdout.strip()
        credentials = Credentials(token)
    # Attribute quota and billing to the chosen project, never to the ADC default quota project.
    credentials = credentials.with_quota_project(project)
    return genai.Client(vertexai=True, project=project, location=location, credentials=credentials)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=MODELS, default="pro")
    parser.add_argument("--only", help="comma-separated candidate ids, e.g. A,C")
    parser.add_argument("--aspect", default="3:4")
    parser.add_argument("--vertex-project", help="use Vertex AI, billed to this GCP project")
    parser.add_argument("--location", default="global")
    parser.add_argument("--size", choices=["1K", "2K", "4K"], default="1K")
    parser.add_argument("--reference", help="image to keep the character consistent with")
    args = parser.parse_args()

    from google import genai
    from google.genai import types

    if args.vertex_project:
        client = vertex_client(args.vertex_project, args.location)
    else:
        client = genai.Client(api_key=load_key())
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = args.only.split(",") if args.only else list(CANDIDATES)

    for cid in wanted:
        prompt = f"{STYLE} {CANDIDATES[cid]}"
        contents: list = [prompt]
        if args.reference:
            ref = pathlib.Path(args.reference)
            contents.insert(0, types.Part.from_bytes(data=ref.read_bytes(), mime_type="image/png"))
        response = client.models.generate_content(
            model=MODELS[args.model],
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=args.aspect, image_size=args.size),
            ),
        )
        saved = False
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                path = OUT / f"robot-{cid}-{args.model}-{args.size}.png"
                path.write_bytes(part.inline_data.data)
                print(f"saved {path.relative_to(ROOT)}")
                saved = True
        if not saved:
            print(f"candidate {cid}: no image returned")


if __name__ == "__main__":
    main()
