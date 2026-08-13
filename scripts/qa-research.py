#!/usr/bin/env python3
"""Fail-closed research gate.

A brief that cannot name Henesys, the maple tree, and Zakum is not
research. Film work must not start until this exits 0.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path("/workspace")
BRIEF = ROOT / ".grok" / "research" / "vault" / "maplestory-idle.md"
BIBLE = ROOT / ".grok" / "research" / "vault" / "film-bible.md"
PROCESS = ROOT / ".grok" / "research" / "PROCESS.md"
BRIEF_ALIVE = ROOT / ".grok" / "research" / "vault" / "character-alive.md"
BRIEF_HANDS = ROOT / ".grok" / "research" / "vault" / "zakum-anatomy.md"
BRIEF_MEMBERS = ROOT / ".grok" / "research" / "vault" / "member-art.md"
MUSIC = ROOT / ".grok" / "research" / "vault" / "maple-music.md"

NEED_PHRASES = [
    "Henesys",
    "Ellinia",
    "Perion",
    "Kerning",
    "Zakum",
    "弓箭手村",
    "魔法森林",
    "勇士之村",
    "墮落城市",
    "殘暴炎魔",
    "maple tree",
    "orange mushroom",
    "Fashion",
    "RegginA",
    "RegginO",
    "idle.maplestorywiki.net",
    "maplestoryidle.nexon.com",
]

CLIPS = [
    "01-void",
    "02-orbit",
    "03-field",
    "04-forest",
    "05-hall",
    "06-raid",
    "07-climb",
    "08-invite",
]

BANNED = [
    "From the dark",
    "spooling",
    "ACT I",
    "Scroll to begin",
    "a chair",
]


def report() -> dict:
    fail = []
    if not PROCESS.exists():
        fail.append("PROCESS.md missing")
    if not BRIEF.exists():
        return {"pass": False, "why": "vault/maplestory-idle.md missing"}
    if not BIBLE.exists():
        fail.append("vault/film-bible.md missing")
    brief = BRIEF.read_text(encoding="utf-8")
    bible = BIBLE.read_text(encoding="utf-8") if BIBLE.exists() else ""
    text = brief + "\n" + bible
    if not BRIEF_ALIVE.exists():
        fail.append("vault/character-alive.md missing")
    else:
        alive = BRIEF_ALIVE.read_text(encoding="utf-8")
        text += "\n" + alive
        if "floating" not in alive.lower() and "overlay" not in alive.lower():
            fail.append("alive brief does not ban overlay")
        if "9:16" not in alive:
            fail.append("alive brief does not lock 9:16")
    if not BRIEF_MEMBERS.exists():
        fail.append("vault/member-art.md missing")
    else:
        members = BRIEF_MEMBERS.read_text(encoding="utf-8")
        text += "\n" + members
        if "costume brief" not in members:
            fail.append("member-art brief does not ban screenshot tiles")
        if "傻瓜小孩" not in members or "騎鳥回家" not in members:
            fail.append("member-art brief missing name hooks")
    if not MUSIC.exists():
        fail.append("vault/maple-music.md missing")
    else:
        music = MUSIC.read_text(encoding="utf-8")
        text += "\n" + music
        if "Mixolydian" not in music:
            fail.append("music brief missing Mixolydian grammar")
    if not BRIEF_HANDS.exists():
        fail.append("vault/zakum-anatomy.md missing")
    else:
        hands = BRIEF_HANDS.read_text(encoding="utf-8")
        text += "\n" + hands
        if "fingers" not in hands.lower():
            fail.append("zakum brief does not lock fingers")
        if "totem *heads*" not in hands and "floating wooden" not in hands.lower():
            fail.append("zakum brief does not ban mask-heads")
        if "Walking toward" not in hands and "pose" not in hands.lower():
            fail.append("zakum brief missing pose variation")

    missing = [p for p in NEED_PHRASES if p.lower() not in text.lower() and p not in text]
    # case-sensitive for CJK, insensitive for latin
    missing = []
    low = text.lower()
    for p in NEED_PHRASES:
        if re.search(r"[\u4e00-\u9fff]", p):
            if p not in text:
                missing.append(p)
        elif p.lower() not in low:
            missing.append(p)
    if missing:
        fail.append("missing tokens: " + ", ".join(missing))
    for clip in CLIPS:
        if clip not in bible:
            fail.append(f"film bible missing {clip}")
    sheen = [b for b in BANNED if b in text]
    if sheen:
        fail.append("cinema sheen in research: " + ", ".join(sheen))
    if "https://" not in brief:
        fail.append("no source URLs")
    if "mannequin" not in brief.lower() and "8F00DDDF" not in brief:
        fail.append("our own screenshots not cited")
    # Henesys must be tied to the maple tree in the same brief
    if "maple tree" not in brief.lower() or "Henesys" not in brief:
        fail.append("Henesys is not bound to the maple tree")
    if "eight" not in brief.lower() and "8 Zakum" not in brief:
        fail.append("Zakum arms not bound to RegginA")
    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else "brief names the real world; bible maps every clip",
        "tokens": len(NEED_PHRASES) - len(missing),
    }


if __name__ == "__main__":
    out = report()
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(0 if out["pass"] else 1)
