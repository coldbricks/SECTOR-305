"""Parse RadioReference ctid 328 CSV into curated SECTOR 305 radio pack."""
from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

DL = Path.home() / "Downloads"
SRC = DL / "ctid_328_1784429922.csv"
OUT = Path(__file__).resolve().parents[1] / "packs" / "miami-a07-police-v0" / "radio_reference.json"
OUT_WEB = (
    Path(__file__).resolve().parents[1]
    / "packages"
    / "web"
    / "public"
    / "radio"
    / "ctid328_watch.json"
)


def main() -> None:
    with open(SRC, encoding="utf-8", errors="replace", newline="") as f:
        rows = list(csv.DictReader(f))
    print("rows", len(rows))
    print("tags", Counter(r.get("Tag", "") for r in rows).most_common(20))

    want_tags = {
        "Law Dispatch",
        "Law Tac",
        "Law Talk",
        "Fire Dispatch",
        "Fire-Tac",
        "Fire-Talk",
        "Interop",
        "Emergency Ops",
        "Hospital",
        "Multi-Tac",
        "Multi-Dispatch",
        "Deprecated",
    }

    def score(r: dict) -> int:
        blob = " ".join(
            [
                r.get("Agency/Category") or "",
                r.get("Description") or "",
                r.get("Alpha Tag") or "",
                r.get("Tag") or "",
            ]
        ).upper()
        s = 0
        for k, w in [
            ("MIAMI-DADE", 3),
            ("MIAMI ", 2),
            ("CITY OF MIAMI", 4),
            ("MDFR", 5),
            ("MDPD", 5),
            ("POLICE", 2),
            ("FIRE", 2),
            ("DISPATCH", 4),
            ("TACTICAL", 2),
            ("TAC", 1),
            ("INTERCITY", 3),
            ("HIDTA", 2),
            ("MEDCOM", 2),
            ("EMS", 1),
            ("PORT", 1),
            ("BEACH", 1),
        ]:
            if k in blob:
                s += w
        tag = r.get("Tag") or ""
        if tag in ("Law Dispatch", "Fire Dispatch"):
            s += 6
        if tag in ("Law Tac", "Fire-Tac", "Interop"):
            s += 3
        return s

    scored = sorted(rows, key=score, reverse=True)
    top = [r for r in scored if score(r) >= 4][:120]

    # Curated watch-bank (training fiction — RR alpha tags + public freqs as flavor)
    watch: list[dict] = []
    seen = set()
    for r in top:
        freq = (r.get("Frequency Output") or "").strip()
        alpha = (r.get("Alpha Tag") or "").strip() or (r.get("Description") or "")[:18]
        key = (freq, alpha)
        if key in seen:
            continue
        seen.add(key)
        tag = r.get("Tag") or ""
        if tag not in want_tags and score(r) < 8:
            continue
        watch.append(
            {
                "freqMHz": float(freq) if freq else None,
                "alpha": alpha[:24],
                "desc": (r.get("Description") or "")[:80],
                "tone": (r.get("PL Output Tone") or "")[:16],
                "mode": (r.get("Mode") or "")[:8],
                "tag": tag,
                "agency": (r.get("Agency/Category") or "")[:60],
                "callsign": (r.get("FCC Callsign") or "")[:12],
                "role": (
                    "pri"
                    if "Dispatch" in tag
                    else "tac"
                    if "Tac" in tag or "Talk" in tag
                    else "svc"
                ),
            }
        )
        if len(watch) >= 48:
            break

    # Force-include known MDFR dispatch from RR page if missing
    must = [
        {
            "freqMHz": 453.35,
            "alpha": "MDFR N Disp",
            "desc": "North - Dispatch",
            "tone": "223 DPL",
            "mode": "FMN",
            "tag": "Fire Dispatch",
            "agency": "Miami-Dade Fire Rescue",
            "callsign": "WPZX249",
            "role": "pri",
        },
        {
            "freqMHz": 460.5,
            "alpha": "MDFR C Disp",
            "desc": "Central - Dispatch",
            "tone": "245 DPL",
            "mode": "FMN",
            "tag": "Fire Dispatch",
            "agency": "Miami-Dade Fire Rescue",
            "callsign": "KIM654",
            "role": "pri",
        },
        {
            "freqMHz": 453.15,
            "alpha": "MDFR S Disp",
            "desc": "South - Dispatch",
            "tone": "263 DPL",
            "mode": "FMN",
            "tag": "Fire Dispatch",
            "agency": "Miami-Dade Fire Rescue",
            "callsign": "WNIY425",
            "role": "pri",
        },
        {
            "freqMHz": 453.1,
            "alpha": "MDFR E Disp",
            "desc": "East - Dispatch",
            "tone": "243 DPL",
            "mode": "FMN",
            "tag": "Fire Dispatch",
            "agency": "Miami-Dade Fire Rescue",
            "callsign": "WQBV755",
            "role": "pri",
        },
    ]
    alphas = {w["alpha"] for w in watch}
    for m in must:
        if m["alpha"] not in alphas:
            watch.insert(0, m)

    pack = {
        "id": "rr-ctid-328-watch-v0",
        "source": "RadioReference Miami-Dade County FL ctid/328 (premium export)",
        "sourceFile": SRC.name,
        "portal": "https://www.radioreference.com/db/browse/ctid/328",
        "disclaimer": (
            "Public scanner database flavor for SECTOR 305 training fiction only. "
            "Not an official agency channel plan. Not for operational use. "
            "Talkgroups/encryption may differ from live systems."
        ),
        "channels": watch,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT_WEB.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pack, indent=2), encoding="utf-8")
    OUT_WEB.write_text(json.dumps(pack, separators=(",", ":")), encoding="utf-8")
    print("wrote", OUT)
    print("wrote", OUT_WEB)
    print("channels", len(watch))
    for w in watch[:20]:
        print(" ", w["freqMHz"], w["alpha"], w["tag"], w["role"])


if __name__ == "__main__":
    main()
