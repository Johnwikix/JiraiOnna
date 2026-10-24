"""Local, non-destructive alpha extraction and a deterministic CG layout repair.

Run with .local/art-venv/Scripts/python.exe. Generated originals stay untouched.
"""
from pathlib import Path
from datetime import datetime, timezone
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art"


def sidecar(source, target, operation, extra=None):
    data = json.loads(source.with_suffix(source.suffix + ".json").read_text(encoding="utf-8"))
    data.update({"source": str(source.relative_to(ROOT)).replace("\\", "/"),
                 "derivedAt": datetime.now(timezone.utc).isoformat(),
                 "postprocess": operation, "hasAlpha": Image.open(target).mode == "RGBA"})
    if extra:
        data.update(extra)
    target.with_suffix(target.suffix + ".json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extract(source_name, target_name, background_islands=()):
    source, target = ART / source_name, ART / target_name
    if target.exists():
        raise FileExistsError(target)
    rgb = np.asarray(Image.open(source).convert("RGB")).copy()
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    white = (lo >= 235) & ((hi.astype(np.int16) - lo) <= 24)
    seeds = np.zeros_like(white)
    seeds[0, :] = white[0, :]
    seeds[-1, :] = white[-1, :]
    seeds[:, 0] = white[:, 0]
    seeds[:, -1] = white[:, -1]
    background = ndimage.binary_propagation(seeds, mask=white)
    # These small, visually inspected islands are gaps between hair strands or
    # between sleeves and torso. The allowlist deliberately excludes eyes and
    # every white garment region; raw source images are retained for audit.
    labels, _ = ndimage.label(white)
    for label in background_islands:
        background |= labels == label
    alpha = np.full(white.shape, 255, dtype=np.uint8)
    alpha[background] = 0
    # Only the one-pixel external silhouette fringe is softened. Interior white
    # garments, eye whites, buttons and highlights are never keyed globally.
    fringe = ndimage.binary_dilation(background) & ~background
    fringe_alpha = np.clip((255.0 - lo.astype(np.float32)) / 120.0, 0.0, 1.0)
    alpha[fringe] = np.rint(255 * fringe_alpha[fringe]).astype(np.uint8)
    semitransparent = (alpha > 0) & (alpha < 255)
    a = alpha[semitransparent].astype(np.float32)[:, None] / 255
    rgb[semitransparent] = np.clip((rgb[semitransparent].astype(np.float32) - 255 * (1 - a)) / a, 0, 255).astype(np.uint8)
    rgb[alpha == 0] = 0
    Image.fromarray(np.dstack((rgb, alpha)), "RGBA").save(target)
    sidecar(source, target, {"method": "border-connected near-white flood extraction with one-pixel alpha fringe", "whiteThreshold": 235,
                            "preserves": "all character pixels, white clothing and eye whites", "inspectedBackgroundIslands": list(background_islands), "script": "scripts/art-postprocess.py"},
            {"transparentPixels": int((alpha == 0).sum()), "opaquePixels": int((alpha == 255).sum()),
             "partialAlphaPixels": int(((alpha > 0) & (alpha < 255)).sum())})
    preview = Image.new("RGBA", Image.fromarray(alpha).size, "#241d35")
    preview.alpha_composite(Image.open(target))
    qa = ROOT / "art" / "qa"
    qa.mkdir(exist_ok=True)
    preview.convert("RGB").save(qa / (target.stem + "-on-dark.png"))
    print(f"{target.name}: RGBA {rgb.shape[1]}x{rgb.shape[0]}, transparent={int((alpha == 0).sum())}")


def envelope_layout():
    """Remove the model's horizontal panel division by arranging the existing
    generated bottle on the pillow image. No new image model or API is used.
    """
    source = ART / "cg-envelope-v2.png"
    bottle_source = ART / "cg-envelope.png"
    target = ART / "cg-envelope-final.png"
    if target.exists():
        raise FileExistsError(target)
    # The top panel is a coherent pillow scene; its lower panel is discarded.
    scene = Image.open(source).convert("RGB").crop((0, 0, 1344, 512)).resize((1344, 768), Image.Resampling.LANCZOS).convert("RGBA")
    # Use the sealed bottle from the original image. The path follows its outer
    # silhouette so no wooden table fragments are carried into the pillow scene.
    bottle = Image.open(bottle_source).convert("RGBA").crop((978, 76, 1201, 354))
    mask = Image.new("L", bottle.size, 0)
    polygon = [(56,18), (73,13), (93,13), (114,18), (132,27), (141,41),
               (143,55), (150,64), (150,79), (146,93), (158,104), (169,123),
               (175,144), (176,167), (174,191), (169,214), (159,235),
               (142,250), (119,260), (92,265), (66,263), (44,256), (26,244),
               (14,226), (7,203), (3,178), (2,150), (4,130), (12,111),
               (24,99), (37,92), (37,73), (40,54), (45,37)]
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.65))
    bottle.putalpha(mask)
    bottle = bottle.resize((172, 214), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", scene.size)
    ImageDraw.Draw(shadow).ellipse((1001, 592, 1186, 632), fill=(33, 19, 35, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(9))
    scene = Image.alpha_composite(scene, shadow)
    scene.alpha_composite(bottle, (1006, 412))
    # A subtle bottom shade keeps the dialogue area quiet without adding a panel.
    shade = Image.new("RGBA", scene.size)
    shade_data = np.zeros((768, 1344, 4), dtype=np.uint8)
    shade_data[:, :, :3] = (18, 17, 37)
    shade_data[:, :, 3] = np.clip((np.arange(768)[:, None] - 560) * 0.22, 0, 46).astype(np.uint8)
    shade = Image.fromarray(shade_data, "RGBA")
    Image.alpha_composite(scene, shade).convert("RGB").save(target)
    sidecar(source, target, {"method": "deterministic local composition of existing generated pillow scene and sealed bottle", "script": "scripts/art-postprocess.py"},
            {"additionalSource": "public/art/cg-envelope.png", "hasAlpha": False,
             "layoutRepair": "discard lower panel, preserve pillow/envelope/photos, place sealed bottle on the bed"})
    print(f"{target.name}: RGB 1344x768, repaired single scene")


if __name__ == "__main__":
    for source, target, islands in [("rin-v2.png", "rin-alpha-v2.png", (17,22,23,26,27,28,29,34,35)),
                                   ("nana.png", "nana-alpha-v2.png", (2,11,17)),
                                   ("shiori.png", "shiori-alpha-v2.png", (4,20)),
                                   ("qing.png", "qing-alpha-v2.png", (2,7,17,20,24))]:
        extract(source, target, islands)
    envelope_layout()
