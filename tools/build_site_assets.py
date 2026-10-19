#!/usr/bin/env python3
"""Build the website's sounds, listen sheets and demo data from the SEGAN projects in art/.

Every step of the scripted demo is a real SEGAN project (art/steps/<scenario>/<step>/). This script lints,
builds and previews each one with SEGAN exactly as a game would (into a throwaway `game/` folder next to a
copy of the project), then writes what the page shows:

  public/demo/<scenario>/index.json          the conversation tree (who says what, which replies lead where)
  public/demo/<scenario>/<step>.json         one agent turn: reply, commands, source diffs, lint, manifest, files, sounds
  public/demo/<scenario>/<step>/             the built sounds (the game's own WAVs; music as Ogg Vorbis) and listen sheets
  public/demo/hero/, hero.json               the hero's theme and the jingle (art/hero)
  public/demo/showcase/, showcase.json       SEGAN's own demo project (art/showcase): kits, songs, SFX, gallery image
  public/demo/features/                      the lint feature's first, failing version (art/steps/features)
  public/demo/gallery.json                   every asset on the site with its gallery cell (art/gallery.yaml)
  public/brand/, public/og/                  the logo and icon (PAGAN sprites, art/brand) and link-preview images
  src/content/docs/                          reference.md, SKILL.md and CHANGELOG.md from SEGAN

The site can't play or show anything SEGAN doesn't produce. SFX are published as the exact WAVs the game gets;
music, stems and kit auditions are encoded to Ogg Vorbis (sample-exact length, so the manifest's loop points
still hold) with a pinned libsndfile and a fixed stream serial, so output is deterministic. `--check` rebuilds
into a temporary folder and fails if anything differs from the committed files (audio and images with a small
tolerance: SEGAN guarantees +/-1 LSB across machines, not identical bytes).

Usage:  python tools/build_site_assets.py [--check] [--segan-repo PATH]
"""

from __future__ import annotations

import argparse
import difflib
import filecmp
import hashlib
import io
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from importlib import metadata
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
import yaml
from PIL import Image

from pagan import api as pagan_api
from pagan.render import frame_image, save_png
from segan import listen

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"
SOURCE_SUFFIXES = {".yaml", ".toml", ".md", ".py"}
SKIP_DIRS = {"previews", ".segan-cache", ".pagan-cache", "build", "__pycache__"}
GODOT_PROJECT = 'config_version=5\n\n[application]\n\nconfig/name="game"\n'
GENERATED = Path("assets/generated/audio")
OGG_QUALITY = 0.6  # libsndfile compression_level for Vorbis (0 = best quality, 1 = smallest); ~110-150 kbps here
OGG_SERIAL = 0x5E6A_0001  # libsndfile picks a random Ogg stream serial; every page gets this one instead
# where a listen sheet's time axis runs, as fractions of its width (the player draws its playhead there)
SHEET_X = [listen.LEFT / listen.WIDTH, (listen.LEFT + listen.PLOT) / listen.WIDTH]


# --- running SEGAN -------------------------------------------------------------------------------


def segan(args: list[str], cwd: Path) -> dict[str, Any]:
    """Run a SEGAN command with --json, the same interface an agent uses."""
    env = {**os.environ, "SEGAN_QUIET": "1"}
    proc = subprocess.run(
        [sys.executable, "-m", "segan", *args, "--json"], cwd=cwd, capture_output=True, text=True, check=False, env=env
    )
    try:
        result: dict[str, Any] = json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise SystemExit(f"segan {' '.join(args)} in {cwd} failed:\n{proc.stdout}\n{proc.stderr}") from None
    return result


def copy_project(src: Path, dst: Path) -> None:
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(*SKIP_DIRS))


BUILT: dict[str, Built] = {}  # every project built in this run, by its path under art/


class Built:
    """One SEGAN project, copied to work/art next to an empty Godot project work/game, linted, built, previewed."""

    def __init__(self, project: Path, work: Path, preview: list[str] | None = None) -> None:
        self.source = project
        self.art = work / "art"
        self.game = work / "game"
        copy_project(project, self.art)
        self.game.mkdir(parents=True)
        (self.game / "project.godot").write_text(GODOT_PROJECT)
        self.lint = segan(["lint"], self.art)
        build = segan(["build"], self.art)
        if not build.get("ok"):
            raise SystemExit(f"segan build failed for {project}: {json.dumps(build, indent=1)}")
        self.generated = self.game / GENERATED
        self.manifest: dict[str, Any] = json.loads((self.generated / "manifest.json").read_text())
        self.previews: dict[str, dict[str, dict[str, Any]]] = {}
        self.preview(list(self.manifest["assets"]) if preview is None else preview)
        BUILT[project.relative_to(ART).as_posix()] = self

    def preview(self, names: list[str]) -> None:
        """`segan preview`: a listen sheet (+ seam view) and the analysis numbers for every output."""
        names = [n for n in names if n not in self.previews]
        if not names:
            return
        result = segan(["preview", *names], self.art)
        if not result.get("ok"):
            raise SystemExit(f"segan preview failed for {self.source}: {json.dumps(result, indent=1)}")
        for item in result["outputs"]:
            self.previews[item["asset"]] = {o["output"]: o for o in item["outputs"]}

    def path(self, res: str) -> Path:
        return self.game / res.removeprefix("res://")

    def files(self) -> list[dict[str, Any]]:
        return [
            {"path": p.relative_to(self.game).as_posix(), "bytes": p.stat().st_size}
            for p in sorted(self.generated.rglob("*"))
            if p.is_file()
        ]


# --- publishing audio ------------------------------------------------------------------------------

_CRC = []
for _i in range(256):
    _r = _i << 24
    for _ in range(8):
        _r = ((_r << 1) ^ 0x04C11DB7) if _r & 0x80000000 else (_r << 1)
    _CRC.append(_r & 0xFFFFFFFF)


def ogg_crc(data: bytes) -> int:
    crc = 0
    for b in data:
        crc = ((crc << 8) & 0xFFFFFFFF) ^ _CRC[((crc >> 24) & 0xFF) ^ b]
    return crc


def fixed_serial(data: bytes) -> bytes:
    """Rewrite every Ogg page's stream serial to OGG_SERIAL and recompute its checksum."""
    out = bytearray(data)
    i = 0
    while i < len(out):
        if out[i : i + 4] != b"OggS":
            raise SystemExit("not an Ogg stream")
        nseg = out[i + 26]
        size = 27 + nseg + sum(out[i + 27 : i + 27 + nseg])
        out[i + 14 : i + 18] = OGG_SERIAL.to_bytes(4, "little")
        out[i + 22 : i + 26] = b"\0\0\0\0"
        out[i + 22 : i + 26] = ogg_crc(bytes(out[i : i + size])).to_bytes(4, "little")
        i += size
    return bytes(out)


def encode_ogg(wav: Path, dst: Path) -> None:
    data, rate = sf.read(wav, dtype="float32", always_2d=True)
    buf = io.BytesIO()
    with sf.SoundFile(buf, "w", rate, data.shape[1], format="OGG", subtype="VORBIS", compression_level=OGG_QUALITY) as f:
        f.write(data)
    dst.write_bytes(fixed_serial(buf.getvalue()))


PUBLISHED: dict[str, str] = {}  # sha256 of a source file -> where it was published (identical outputs are shared)
DEMO = [Path()]  # public/demo of this run: every published path is relative to it


def _published(src: Path, how: str) -> tuple[str, str | None]:
    digest = hashlib.sha256(how.encode() + src.read_bytes()).hexdigest()
    return digest, PUBLISHED.get(digest)


def publish_audio(wav: Path, out: Path, rel: str, compress: bool) -> str:
    """Copy the game's WAV (SFX) or encode it to Ogg Vorbis (music, stems, kit auditions); return its site path.
    A file identical to one already published (the same sound in a later demo step) is shared, not copied."""
    digest, seen = _published(wav, f"audio:{compress}")
    if seen:
        return seen
    name = wav.name if not compress else wav.with_suffix(".ogg").name
    target = out / rel / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if compress:
        encode_ogg(wav, target)
    else:
        shutil.copyfile(wav, target)
    PUBLISHED[digest] = target.relative_to(DEMO[0]).as_posix()
    return PUBLISHED[digest]


def publish_image(src: Path, out: Path, rel: str, name: str | None = None) -> str:
    """A listen sheet as lossless WebP: the same pixels as SEGAN's PNG, about half the bytes."""
    digest, seen = _published(src, "image")
    if seen:
        return seen
    target = out / rel / Path(name or src.name).with_suffix(".webp")
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im.save(target, "WEBP", lossless=True, quality=100, method=6)
    PUBLISHED[digest] = target.relative_to(DEMO[0]).as_posix()
    return PUBLISHED[digest]


# --- sounds of one asset ---------------------------------------------------------------------------


def output_entry(
    built: Built, entry: dict[str, Any], out: Path, rel: str, *, compress: bool, preview: dict[str, Any] | None, label: str,
    oid: str, sheets: bool, seam: bool = False,
) -> dict[str, Any]:
    wav = built.path(entry["file"])
    info = sf.info(wav)
    if info.frames != entry["samples"]:
        raise SystemExit(f"{wav}: {info.frames} frames, manifest says {entry['samples']}")
    item: dict[str, Any] = {
        "id": oid,
        "label": label,
        "audio": publish_audio(wav, out, rel, compress),
        "rate": info.samplerate,
        "samples": entry["samples"],
        "seconds": round(entry["samples"] / info.samplerate, 6),
        "channels": entry["channels"],
        "loop": [entry["loop"]["start"], entry["loop"]["end"]] if entry.get("loop") else None,
        "sheet": None,
        "seam": None,
    }
    if preview is not None:
        a = preview["analysis"]
        if a["frames"] != entry["samples"]:
            raise SystemExit(f"{wav}: the preview has {a['frames']} frames, the build {entry['samples']}")
        item["lufs"] = a["lufs"]
        item["target"] = a.get("target_lufs")
        item["peak"] = a["true_peak_dbtp"]
        if "leading_silence_ms" in a:
            item["lead_in_ms"] = a["leading_silence_ms"]
        if "seam_click" in a:
            item["seam_click"] = a["seam_click"]
        if sheets:
            item["sheet"] = publish_image(built.art / preview["sheet"], out, rel)
            if seam and "seam" in preview:
                item["seam"] = publish_image(built.art / preview["seam"], out, rel)
    return item


def sounds(built: Built, name: str, out: Path, rel: str, show: dict[str, Any]) -> dict[str, Any]:
    """Everything the page plays for one asset: main output, and variations / variants / phases / stems."""
    entry = built.manifest["assets"][name]
    kind = entry["kind"]
    song = kind == "song"
    previews = built.previews.get(name, {})
    outputs = [output_entry(built, entry, out, rel, compress=song, preview=previews.get("main"), label="main", oid="main", sheets=True,
                            seam=bool(show.get("seam")))]  # fmt: skip
    if show.get("variations"):
        for i, v in enumerate(entry.get("variations", []), 1):
            outputs.append(output_entry(built, v, out, rel, compress=False, preview=previews.get(f"variation:{i}"),
                                        label=str(i), oid=f"variation:{i}", sheets=False))  # fmt: skip
    for phase, v in entry.get("phases", {}).items():
        outputs.append(output_entry(built, v, out, rel, compress=False, preview=previews.get(f"phase:{phase}"),
                                    label=phase, oid=f"phase:{phase}", sheets=True, seam=True))  # fmt: skip
    if show.get("variants"):
        for variant, v in entry.get("variants", {}).items():
            outputs.append(output_entry(built, v, out, rel, compress=True, preview=previews.get(f"variant:{variant}"),
                                        label=variant, oid=f"variant:{variant}", sheets=True))  # fmt: skip
    if show.get("stems"):
        for track, v in entry.get("stems", {}).items():
            outputs.append(output_entry(built, v, out, f"{rel}/stems", compress=True, preview=None, label=track,
                                        oid=f"stem:{track}", sheets=False))  # fmt: skip
    data: dict[str, Any] = {
        "name": name,
        "kind": kind,
        "category": entry.get("category"),
        "description": entry.get("description", ""),
        "status": entry.get("status"),
        "outputs": outputs,
    }
    if song:
        data["timing"] = {k: entry[k] for k in ("bpm", "bars", "beat_seconds", "meter", "key")}
        data["variant_timing"] = {n: {"bpm": v["bpm"], "beat_seconds": v["beat_seconds"]} for n, v in entry.get("variants", {}).items()}
    return data


def godot_excerpt(built: Built, entry: dict[str, Any], show: dict[str, Any]) -> dict[str, str]:
    """The Godot file that matters for this turn: a randomizer, stems, or the WAV's .import with loop points."""
    if entry.get("godot_randomizer") and show.get("variations"):
        path = built.path(entry["godot_randomizer"])
    elif entry.get("godot_stems") and show.get("stems"):
        path = built.path(entry["godot_stems"])
    else:
        phases = entry.get("phases", {})
        looped = next((p for p in phases.values() if p.get("loop")), None)
        path = built.path((looped or entry)["file"]).with_name(built.path((looped or entry)["file"]).name + ".import")
    text = path.read_text().rstrip("\n")
    return {"path": path.relative_to(built.game).as_posix(), "text": text}


# --- sources and diffs ---------------------------------------------------------------------------


def sources(step_dir: Path) -> dict[str, str]:
    out = {}
    for path in sorted(step_dir.rglob("*")):
        rel = path.relative_to(step_dir)
        if path.is_file() and path.suffix in SOURCE_SUFFIXES and not (set(rel.parts) & SKIP_DIRS):
            out[rel.as_posix()] = path.read_text(encoding="utf-8")
    return out


def file_order(path: str) -> tuple[int, str]:
    """Assets first, then kits, settings, docs: what a reader cares about most."""
    rank = {"sfx": 0, "music": 0, "kits": 2}.get(path.split("/")[0], 4)
    if path == "segan.toml":
        rank = 5
    if path.endswith(".md"):
        rank = 6
    return rank, path


def diff(before: dict[str, str], after: dict[str, str]) -> list[dict[str, Any]]:
    changes = []
    for path in sorted(set(before) | set(after), key=file_order):
        a, b = before.get(path), after.get(path)
        if a == b:
            continue
        status = "added" if a is None else "removed" if b is None else "modified"
        lines = list(
            difflib.unified_diff(
                (a or "").splitlines(), (b or "").splitlines(), f"a/{path}", f"b/{path}", n=3, lineterm=""
            )
        )
        added = sum(1 for line in lines if line.startswith("+") and not line.startswith("+++"))
        removed = sum(1 for line in lines if line.startswith("-") and not line.startswith("---"))
        changes.append(
            {"path": path, "status": status, "added": added, "removed": removed, "diff": "\n".join(lines[2:])}
        )
    return changes


def lint_summary(lint: dict[str, Any]) -> dict[str, Any]:
    return {"errors": lint["errors"], "warnings": lint["warnings"], "findings": lint["findings"]}


# --- one step ------------------------------------------------------------------------------------


def step_data(
    scenario: dict[str, Any], step_id: str, parents: list[str], out: Path, work: Path, features: dict[str, Any]
) -> dict[str, Any]:
    sid = scenario["id"]
    step = scenario["steps"][step_id]
    step_dir = ART / "steps" / sid / step_id
    show = step["show"]
    built = Built(step_dir, work / step_id, preview=show["sounds"])
    src = sources(step_dir)
    entries = {n: built.manifest["assets"][n] for n in show["sounds"]}
    first = entries[show["sounds"][0]]
    data: dict[str, Any] = {
        "scenario": sid,
        "id": step_id,
        "agent": " ".join(step["agent"].split()),
        "ran": step.get("ran", []),
        "show": show,
        "lint": lint_summary(built.lint),
        "diffs": {p: diff(sources(ART / "steps" / sid / p), src) for p in parents} or {"": diff({}, src)},
        "sounds": [sounds(built, n, out, step_id, show) for n in show["sounds"]],
        "manifest": entries,
        "files": built.files(),
        "godot": godot_excerpt(built, first, show),
        "sheet_x": SHEET_X,
    }
    if show.get("before"):
        data["before"] = features[show["before"]]
    return data


def scenario_data(path: Path, out_root: Path, work: Path, features: dict[str, Any]) -> dict[str, Any]:
    scenario = yaml.safe_load(path.read_text())
    sid = scenario["id"]
    out = out_root / sid
    out.mkdir(parents=True)
    steps = scenario["steps"]
    parents: dict[str, list[str]] = {s: [] for s in steps}
    choices: dict[str, list[dict[str, str]]] = {}
    for s, step in steps.items():
        choices[s] = []
        for n in step.get("next", []):
            to, say = (n, steps[n]["user"]) if isinstance(n, str) else (n["to"], n["say"])
            parents[to].append(s)
            choices[s].append({"to": to, "say": say})
    for s in steps:
        data = step_data(scenario, s, parents[s], out, work / sid, features)
        data["next"] = choices[s]
        write_json(out / f"{s}.json", data)
    index = {
        "id": sid,
        "title": scenario["title"],
        "pitch": scenario["pitch"],
        "start": scenario["start"],
        "steps": {s: {"user": steps[s]["user"], "next": choices[s], "parents": parents[s]} for s in steps},
    }
    write_json(out / "index.json", index)
    return index


# --- hero, showcase, features, gallery -----------------------------------------------------------


def hero(demo: Path, work: Path) -> None:
    built = Built(ART / "hero", work / "hero")
    data = {
        "sounds": {n: sounds(built, n, demo, "hero", {}) for n in ("theme", "jingle")},
        "manifest": built.manifest["assets"]["theme"],
        "sheet_x": SHEET_X,
    }
    write_json(demo / "hero.json", data)


def gallery_cells(built: Built, out: Path, rel: str, only: list[str] | None) -> dict[str, str]:
    """`segan gallery` for the project, cut into one image per asset (its mini waveform + spectrogram)."""
    result = segan(["gallery"], built.art)
    image = Image.open(built.art / result["gallery"])
    names = sorted(built.manifest["assets"], key=lambda n: (built.manifest["assets"][n]["kind"] != "sfx", n))
    cols = 4
    cell_w = (listen.WIDTH - 20) // cols
    cell_h = 18 + 40 + 70 + 10
    cells = {}
    for i, name in enumerate(names):
        if only is not None and name not in only:
            continue
        x = 10 + (i % cols) * cell_w
        y = 40 + (i // cols) * cell_h + 16
        crop = image.crop((x, y, x + cell_w - 10 + 1, y + 40 + 2 + 70))
        target = out / rel / f"{name}.gallery.webp"
        target.parent.mkdir(parents=True, exist_ok=True)
        crop.save(target, "WEBP", lossless=True, quality=100, method=6)
        cells[name] = target.relative_to(DEMO[0]).as_posix()
    return cells


def showcase(demo: Path, work: Path) -> dict[str, Any]:
    """SEGAN's own demo project: kit auditions, its songs and SFX (gallery), step variations, the gallery image."""
    built = Built(ART / "showcase", work / "showcase")
    out_rel = "showcase"
    kits = []
    shown = segan(["kit", "show"], built.art)
    for k in shown["outputs"]:
        kit_yaml = yaml.safe_load((built.art / "kits" / f"{k['kit']}.kit.yaml").read_text())
        wavs = {Path(w).name: built.art / w for w in k["wavs"]}
        instruments = []
        for key, inst in k["instruments"].items():
            wav = wavs[f"{k['kit']}.{inst['name']}.wav"]
            instruments.append({"key": key, "name": inst["name"], "source": inst["source"],
                                "audio": publish_audio(wav, demo, f"{out_rel}/kits", True)})  # fmt: skip
        kits.append({
            "name": k["kit"],
            "description": kit_yaml.get("description", ""),
            "sheet": publish_image(built.art / k["sheet"], demo, f"{out_rel}/kits"),
            "instruments": instruments,
        })  # fmt: skip
    gallery_png = segan(["gallery"], built.art)["gallery"]
    data = {
        "kits": kits,
        "gallery": publish_image(built.art / gallery_png, demo, out_rel, "gallery.png"),
        "sounds": {n: sounds(built, n, demo, out_rel, {"variations": n == "step"}) for n in built.manifest["assets"]},
        "cells": gallery_cells(built, demo, out_rel, None),
        "sheet_x": SHEET_X,
    }
    write_json(demo / "showcase.json", data)
    return data


def features(demo: Path, work: Path) -> dict[str, Any]:
    """First versions that lint flagged (art/steps/features/<name>), shown next to the fixed step."""
    out: dict[str, Any] = {}
    for step_dir in sorted((ART / "steps" / "features").iterdir()):
        name = step_dir.name
        built = Built(step_dir, work / "features" / name, preview=[])
        asset = Path(built.lint["findings"][0]["path"]).name.removesuffix(".sfx.yaml")  # the sound lint flagged
        built.preview([asset])
        out[f"features/{name}"] = {
            "lint": lint_summary(built.lint),
            "source": (step_dir / "sfx" / f"{asset}.sfx.yaml").read_text(),
            "sound": sounds(built, asset, demo, f"features/{name}", {}),
        }
    return out


def gallery(demo: Path, work: Path, show: dict[str, Any]) -> None:
    """Every asset on the site: name, kind, description, numbers, its gallery cell and where its audio is."""
    spec = yaml.safe_load((ART / "gallery.yaml").read_text())
    items = []
    for group in spec["groups"]:
        if group.get("project") == "showcase":
            source, sounds_of, cells = "showcase", show["sounds"], show["cells"]
        elif group.get("project") == "hero":
            sounds_of = json.loads((demo / "hero.json").read_text())["sounds"]
            cells = gallery_cells(BUILT["hero"], demo, "hero", list(sounds_of))
            source = "hero"
        else:
            source = group["step"]
            sid, step_id = source.split("/")
            sounds_of = {s["name"]: s for s in json.loads((demo / sid / f"{step_id}.json").read_text())["sounds"]}
            cells = gallery_cells(BUILT[f"steps/{source}"], demo, f"{sid}/{step_id}", list(sounds_of))
        for name in group.get("only") or list(sounds_of):
            s = sounds_of[name]
            main = s["outputs"][0]
            items.append({
                "name": name,
                "group": group["label"],
                "kind": s["kind"],
                "category": s["category"],
                "description": s["description"],
                "status": s["status"],
                "seconds": main["seconds"],
                "lufs": main.get("lufs"),
                "target": main.get("target"),
                "loop": main["loop"],
                "audio": main["audio"],
                "rate": main["rate"],
                "samples": main["samples"],
                "cell": cells.get(name),
                "source": source,
                "variants": len(s.get("variant_timing", {})),
                "variations": sum(o["id"].startswith("variation:") for o in s["outputs"]),
                "phases": [o["label"] for o in s["outputs"] if o["id"].startswith("phase:")],
            })  # fmt: skip
    write_json(demo / "gallery.json", items)


# --- brand, og images, docs ----------------------------------------------------------------------


def brand(public: Path, work: Path) -> None:
    """The logo and icon: PAGAN sprites (SEGAN's sister draws the pixels)."""
    art = work / "brand"
    copy_project(ART / "brand", art)
    out = public / "brand"
    out.mkdir(parents=True)
    project = pagan_api.open_project(art)
    for name, scales in {"logo": (1, 4), "mark": (1, 2, 4, 12)}.items():
        image = frame_image(pagan_api.load(art / "sprites" / f"{name}.sprite.yaml", project), "main")
        for s in scales:
            save_png(image.resize((image.width * s, image.height * s), Image.Resampling.NEAREST), out / f"{name}@{s}x.png")


def og_images(public: Path, demo: Path) -> None:
    """Link-preview image (1200x630): the logo over the hero theme's real listen sheet."""
    out = public / "og"
    out.mkdir(parents=True)
    image = Image.new("RGBA", (1200, 630), (16, 18, 31, 255))
    hero_data = json.loads((demo / "hero.json").read_text())
    with Image.open(demo / hero_data["sounds"]["theme"]["outputs"][0]["sheet"]) as sheet:
        crop = sheet.convert("RGBA").crop((0, 152, 1200, min(sheet.height, 152 + 470)))
    image.alpha_composite(crop, (0, 630 - crop.height))
    brand_project = pagan_api.open_project(ART / "brand")
    logo = frame_image(pagan_api.load(ART / "brand/sprites/logo.sprite.yaml", brand_project), "main")
    mark = frame_image(pagan_api.load(ART / "brand/sprites/mark.sprite.yaml", brand_project), "main")
    band = Image.new("RGBA", (1200, 150), (16, 18, 31, 255))
    image.alpha_composite(band, (0, 0))
    image.alpha_composite(mark.resize((mark.width * 7, mark.height * 7), Image.Resampling.NEAREST), (48, 20))
    image.alpha_composite(logo.resize((logo.width * 6, logo.height * 6), Image.Resampling.NEAREST), (180, 27))
    save_png(image, out / "segan.png")


def docs(content: Path, segan_repo: Path | None) -> None:
    """One source of truth: the reference and workflow ship inside the segan package; the changelog comes
    from a SEGAN checkout (pass --segan-repo or set SEGAN_REPO)."""
    import segan as segan_pkg

    out = content / "docs"
    out.mkdir(parents=True)
    skill = Path(segan_pkg.__file__).parent / "skill"
    shutil.copyfile(skill / "reference.md", out / "reference.md")
    workflow = (skill / "SKILL.md").read_text(encoding="utf-8").replace("](reference.md)", "](../reference/)")
    (out / "workflow.md").write_text(workflow, encoding="utf-8")
    if segan_repo is None or not (segan_repo / "CHANGELOG.md").is_file():
        raise SystemExit("CHANGELOG.md not found: pass --segan-repo <SEGAN checkout> or set SEGAN_REPO")
    shutil.copyfile(segan_repo / "CHANGELOG.md", out / "changelog.md")
    write_json(out / "meta.json", {"segan": metadata.version("segan"), "pagan": metadata.version("pagan")})


# --- main ----------------------------------------------------------------------------------------


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def generate(public: Path, content: Path, segan_repo: Path | None) -> list[dict[str, Any]]:
    with tempfile.TemporaryDirectory(prefix="segan-site-") as tmp:
        work = Path(tmp)
        demo = public / "demo"
        demo.mkdir(parents=True)
        DEMO[0] = demo
        feats = features(demo, work)
        paths = sorted((ART / "scenarios").glob("*.yaml"), key=lambda p: (yaml.safe_load(p.read_text())["order"], p.name))
        scenarios = [scenario_data(p, demo, work, feats) for p in paths]
        write_json(demo / "scenarios.json", [{"id": s["id"], "title": s["title"], "pitch": s["pitch"]} for s in scenarios])
        hero(demo, work)
        show = showcase(demo, work)
        gallery(demo, work, show)
        brand(public, work)
        og_images(public, demo)
        docs(content, segan_repo)
    return scenarios


# --- --check: compare with a tolerance ----------------------------------------------------------


def same_audio(a: Path, b: Path) -> bool:
    """Same length and channels; samples within a few LSB (WAV: SEGAN's +/-1 LSB; Ogg: decoded, -60 dB)."""
    da, ra = sf.read(a, dtype="float64", always_2d=True)
    db, rb = sf.read(b, dtype="float64", always_2d=True)
    if ra != rb or da.shape != db.shape:
        return False
    if a.suffix == ".wav":
        return float(np.abs(da - db).max(initial=0.0)) <= 2 / 32768
    rms = math.sqrt(float(np.mean(da**2)) or 1e-12)
    return math.sqrt(float(np.mean((da - db) ** 2))) <= rms * 1e-3


def same_pixels(a: Path, b: Path) -> bool:
    """Listen sheets draw the audio, so a 1-LSB difference can nudge a few spectrogram pixels."""
    with Image.open(a) as ia, Image.open(b) as ib:
        if ia.size != ib.size:
            return False
        pa = np.asarray(ia.convert("RGBA"), dtype=np.int16)
        pb = np.asarray(ib.convert("RGBA"), dtype=np.int16)
    d = np.abs(pa - pb).max(axis=2)
    return float((d > 24).mean()) <= 0.002 and float(d.mean()) <= 0.5


def same_json(a: Any, b: Any, key: str = "") -> bool:
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(same_json(a[k], b[k], k) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(same_json(x, y, key) for x, y in zip(a, b))
    if isinstance(a, bool) or isinstance(b, bool) or not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        return bool(a == b)
    if key == "bytes":  # Ogg sizes follow the encoded samples
        return abs(a - b) <= max(64, 0.03 * abs(b))
    if isinstance(a, int) and isinstance(b, int):
        return a == b
    return abs(a - b) <= max(0.05, 0.005 * abs(b))


def same_file(a: Path, b: Path) -> bool:
    if a.suffix in (".wav", ".ogg"):
        return same_audio(a, b)
    if a.suffix in (".png", ".webp"):
        return same_pixels(a, b)
    if a.suffix == ".json":
        return same_json(json.loads(a.read_text()), json.loads(b.read_text()))
    return False


def same_tree(a: Path, b: Path) -> list[str]:
    cmp = filecmp.dircmp(a, b)
    problems = [f"{a / n}: only in one" for n in cmp.left_only + cmp.right_only]
    problems += [str(b / n) for n in cmp.diff_files if not same_file(a / n, b / n)]
    for sub in cmp.common_dirs:
        problems += same_tree(a / sub, b / sub)
    return problems


def main() -> None:
    parser = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    parser.add_argument("--check", action="store_true", help="fail if the committed output is out of date")
    parser.add_argument("--segan-repo", type=Path, default=os.environ.get("SEGAN_REPO"))
    args = parser.parse_args()
    segan_repo = Path(args.segan_repo).resolve() if args.segan_repo else None
    targets = {
        "demo": ROOT / "public" / "demo",
        "brand": ROOT / "public" / "brand",
        "og": ROOT / "public" / "og",
        "docs": ROOT / "src" / "content" / "docs",
    }
    with tempfile.TemporaryDirectory(prefix="segan-site-out-") as tmp:
        public, content = Path(tmp) / "public", Path(tmp) / "content"
        scenarios = generate(public, content, segan_repo)
        fresh = {"demo": public / "demo", "brand": public / "brand", "og": public / "og", "docs": content / "docs"}
        if args.check:
            problems = [p for k in targets for p in same_tree(fresh[k], targets[k])] if all(
                t.is_dir() for t in targets.values()
            ) else ["committed output missing"]
            if problems:
                print("Site assets are out of date; run python tools/build_site_assets.py", *problems, sep="\n  ")
                raise SystemExit(1)
            print("Site assets are up to date.")
            return
        for key, target in targets.items():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(fresh[key], target)
    steps = sum(len(s["steps"]) for s in scenarios)
    print(f"Built {len(scenarios)} scenarios, {steps} steps with segan {metadata.version('segan')}.")


if __name__ == "__main__":
    main()
