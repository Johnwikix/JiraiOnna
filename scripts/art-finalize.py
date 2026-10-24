"""Register only the locally rendered images that have passed visual review."""
from pathlib import Path
from datetime import datetime, timezone
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art"
MEDIA = {
    "backgrounds": {**{name: f"/art/{name}.png" for name in
        ("rain", "izakaya", "station", "room", "door", "konbini", "cafe", "bookshop", "home")},
        "dawn": "/art/dawn-v2.png"},
    "portraits": {name: f"/art/{name}-alpha-v2.png" for name in ("rin", "nana", "shiori", "qing")},
    "cgs": {"cg-window": "/art/cg-window.png", "cg-chase": "/art/cg-chase-v2.png",
            "cg-envelope": "/art/cg-envelope-final.png", "cg-dinner": "/art/cg-dinner.png",
            "cg-departure": "/art/cg-departure-v2.png"}
}

NOTES = {
    "rin": "Second render restores two low black bows; sweet smile and direct violet gaze. Border matte plus inspected background gaps, original retained.",
    "dawn": "Second render removes the unintended woman from the first render.",
    "cg-window": "Rain window, security bars, direct stare, black hair, purple contacts and lace outfit checked.",
    "cg-chase": "Second render corrects duplicate passerby and close framing; solo full body running with platform shoes and lit store in distance.",
    "cg-envelope": "Second render still divided the composition; local deterministic composition arranges envelope, two photographs and sealed bottle on the bed in one scene. No gore or liquid identity is depicted.",
    "cg-dinner": "Adult Shiori across the table, face uncovered, cardigan and ordinary late meal checked.",
    "cg-departure": "Second render replaces close duplicated figures with one distant figure viewed through a train door. The far platform is stylized; tracks are not clearly visible."
}

deliverables = []
for group, entries in MEDIA.items():
    for asset_id, url in entries.items():
        file = ROOT / "public" / url.lstrip("/")
        with Image.open(file) as im:
            im.verify()
        im = Image.open(file)
        size = im.size
        has_alpha = im.mode == "RGBA" and im.getchannel("A").getextrema()[0] == 0
        expected = (832, 1216) if group == "portraits" else (1344, 768)
        assert size == expected, (file, size, expected)
        assert has_alpha == (group == "portraits"), (file, has_alpha)
        meta_file = file.with_suffix(file.suffix + ".json")
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        assert "seed" in meta and "workflow" in meta and "prompt" in meta and "generatedAt" in meta
        deliverables.append({"id": asset_id, "group": group, "path": str(file.relative_to(ROOT)).replace("\\", "/"),
            "width": size[0], "height": size[1], "hasAlpha": has_alpha, "mode": im.mode,
            "bytes": file.stat().st_size, "model": meta["model"], "seed": meta["seed"],
            "metadata": str(meta_file.relative_to(ROOT)).replace("\\", "/"),
            "visualReview": "accepted", "reviewNote": NOTES.get(asset_id, "Composition, original anime style, absence of readable overlay text and required content visually inspected."),
            "postprocessed": bool(meta.get("postprocess"))})

manifest = {
    "reviewedAt": datetime.now(timezone.utc).isoformat(),
    "execution": "User-requested local ComfyUI CLI at http://127.0.0.1:8188; no external image API",
    "models": {"diffusion": "anima-turbo-v1.1.safetensors", "textEncoder": "qwen_3_06b_base.safetensors", "vae": "qwen_image_vae.safetensors"},
    "generation": {"steps": 10, "cfg": 1, "sampler": "euler", "scheduler": "simple"},
    "reviewMethod": "Every raw, second-pass and final selected image was opened with view_image. Portrait mattes also reviewed on a dark backdrop. File dimensions, PNG decoding, metadata and actual zero-alpha pixels verified.",
    "counts": {group: len(entries) for group, entries in MEDIA.items()},
    "deliverables": deliverables,
    "unresolvedIssues": [
        "Small costume details vary across CGs: bow height, collar lace and skirt panels are not perfectly identical to the standing sprite.",
        "The departure scene communicates distance through train-door glass, but the model did not clearly draw the two requested intervening railway tracks.",
        "Tiny generated shop/door marks remain abstract, unreadable strokes; no authored text or watermark is present."
    ],
    "retainedOriginals": "All first renders, second renders, pre-refinement mattes and the first envelope composition remain beside the final files with sidecar metadata.",
    "sourcePrompts": "art/prompts.json",
    "reproduction": ["scripts/art-workflow.js", "scripts/art-revisions.mjs", "scripts/art-postprocess.py"]
}
(ROOT / "public" / "media.json").write_text(json.dumps(MEDIA, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "art" / "qa-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"counts": manifest["counts"], "validated": len(deliverables), "totalFinalBytes": sum(d["bytes"] for d in deliverables)}, ensure_ascii=False))
