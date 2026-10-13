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
    # Pose variants for the hero flow: the robot looks and gestures toward the active step.
    # Generated from the approved full-body art as the reference so the character, lighting,
    # scale and framing stay identical; only head direction and the gesturing arm change.
    **{
        f"pose-{name}": "Recreate the reference image exactly: the same robot, identical materials, "
        "lighting, colours, camera angle, scale and position in the frame, both feet in exactly the "
        "same place on the ground, the left arm relaxed at the side as in the reference. Change only "
        f"the pose: {pose}"
        for name, pose in {
            "user": "the head and visor are clearly turned to the viewer's left (towards the left edge "
            "of the frame), the face shown in left profile looking up-left, and the right arm reaches up "
            "and to the left with an open palm, welcoming a request from that direction.",
            "llm": "the head tilts up and turns toward the upper right of the frame, and the right "
            "arm points up and to the right with the index finger extended.",
            "rag": "the head turns to look toward the right of the frame at shoulder height, and the "
            "right arm extends straight out to the right with an open palm, receiving something.",
            "tools": "the head tilts clearly downward and turns to the viewer's right, looking at the "
            "lower right corner of the frame, and the right arm points diagonally downward to the lower "
            "right at about 45 degrees below horizontal, index finger extended.",
            "guardrails": "the head turns to look down toward the lower left of the frame, and the "
            "right arm is raised across the body with the palm facing outward to the lower left, a "
            "calm stop-and-check gesture.",
        }.items()
    },
    # Targeted fix for the USER pose: keep everything, turn only the head.
    "pose-user-head": "Keep this image exactly as it is (same robot, pose, raised waving arm, lighting, "
    "framing and feet). Change only the head: rotate the head and visor about 50 degrees towards the "
    "viewer's left, so the visor faces the upper-left corner of the frame, as if greeting someone there.",
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
