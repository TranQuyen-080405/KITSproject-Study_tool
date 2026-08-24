#!/usr/bin/env python3
"""Run AI-service chat benchmark cases from tests/benchmark.csv.

Usage (from repo root or this folder):
  python apps/ai-service/tests/scripts/run_benchmark.py
  python apps/ai-service/tests/scripts/run_benchmark.py --base-url http://localhost:3004

Requires a running AI service (e.g. docker compose up -d ai-service).
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

HANGUL_RE = re.compile(r"[\uac00-\ud7a3]")
VIET_RE = re.compile(
    r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
    r"ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]"
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT / "benchmark.csv"
DEFAULT_OUT_DIR = ROOT / "results"


def safe_print(text: str) -> None:
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode(encoding, errors="replace").decode(encoding, errors="replace"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark AI service chat replies")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Benchmark cases CSV")
    parser.add_argument("--base-url", default="http://localhost:3004", help="AI service base URL")
    parser.add_argument("--user-id", default="benchmark-runner", help="x-user-id header")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR, help="Output directory")
    parser.add_argument("--timeout", type=float, default=60.0, help="HTTP timeout seconds")
    return parser.parse_args()


def api_request(base_url: str, method: str, path: str, user_id: str, body: dict | None, timeout: float) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "x-user-id": user_id,
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} -> HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"{method} {path} -> connection failed: {error.reason}") from error


def hangul_ratio(text: str) -> float:
    letters = [ch for ch in text if ch.isalpha() or HANGUL_RE.match(ch)]
    if not letters:
        return 0.0
    return sum(1 for ch in letters if HANGUL_RE.match(ch)) / len(letters)


def has_vietnamese(text: str) -> bool:
    return bool(VIET_RE.search(text))


def score_language(reply: str, expected: str) -> tuple[bool, str]:
    expected = expected.strip().lower()
    ratio = hangul_ratio(reply)
    viet = has_vietnamese(reply)

    if expected in {"ko", "korean", "kr"}:
        # Conversation replies should be Hangul-heavy.
        ok = ratio >= 0.45 and not (viet and ratio < 0.7)
        detail = f"hangul_ratio={ratio:.2f} vietnamese_chars={viet}"
        return ok, detail

    if expected in {"vi", "vietnamese", "vn"}:
        # Explanations should be readable Vietnamese; Hangul examples are allowed.
        ok = viet or ("nghĩa" in reply.lower()) or ("là" in reply.lower())
        # Fail if almost entirely Korean with almost no Latin/Vietnamese.
        latin = sum(1 for ch in reply if ("a" <= ch.lower() <= "z"))
        if ratio > 0.85 and latin < 20 and not viet:
            ok = False
        detail = f"hangul_ratio={ratio:.2f} vietnamese_chars={viet} latin_letters={latin}"
        return ok, detail

    return False, f"unknown expected_language={expected}"


def load_cases(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    required = {"id", "suite", "conversation_group", "turn", "user_prompt", "expected_language"}
    if not rows:
        raise SystemExit(f"No rows in {path}")
    missing = required - set(rows[0].keys())
    if missing:
        raise SystemExit(f"CSV missing columns: {sorted(missing)}")
    return rows


def run_benchmark(args: argparse.Namespace) -> int:
    cases = load_cases(args.csv)
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in cases:
        grouped[row["conversation_group"]].append(row)
    for group_rows in grouped.values():
        group_rows.sort(key=lambda row: int(row["turn"]))

    health = api_request(args.base_url, "GET", "/health", args.user_id, None, args.timeout)
    if health.get("status") != "ok":
        raise SystemExit(f"AI service unhealthy: {health}")

    results: list[dict[str, object]] = []
    passed = 0

    for group, group_rows in grouped.items():
        conversation = api_request(
            args.base_url,
            "POST",
            "/conversations",
            args.user_id,
            {"title": f"benchmark:{group}"},
            args.timeout,
        )
        conversation_id = conversation["id"]

        for row in group_rows:
            prompt = row["user_prompt"]
            expected_language = row["expected_language"]
            error = ""
            reply = ""
            provider = ""
            model = ""
            input_tokens = None
            output_tokens = None
            language_ok = False
            language_detail = ""

            try:
                chat = api_request(
                    args.base_url,
                    "POST",
                    f"/conversations/{conversation_id}/messages",
                    args.user_id,
                    {"content": prompt},
                    args.timeout,
                )
                reply = chat["assistant_message"]["content"]
                provider = chat.get("provider", "")
                model = chat.get("model", "")
                input_tokens = chat.get("input_tokens")
                output_tokens = chat.get("output_tokens")
                language_ok, language_detail = score_language(reply, expected_language)
            except Exception as exc:  # noqa: BLE001 - collect per-case failures
                error = str(exc)
                language_detail = "request_failed"

            case_pass = language_ok and not error
            if case_pass:
                passed += 1

            results.append(
                {
                    "id": row["id"],
                    "suite": row["suite"],
                    "conversation_group": group,
                    "turn": row["turn"],
                    "user_prompt": prompt,
                    "expected_behavior": row.get("expected_behavior", ""),
                    "expected_language": expected_language,
                    "check_notes": row.get("check_notes", ""),
                    "pass": case_pass,
                    "language_ok": language_ok,
                    "language_detail": language_detail,
                    "error": error,
                    "provider": provider,
                    "model": model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "assistant_reply": reply,
                    "api_conversation_id": conversation_id,
                }
            )
            status = "PASS" if case_pass else "FAIL"
            safe_print(f"[{status}] #{row['id']} {row['suite']} ({expected_language})")
            if error:
                safe_print(f"  error: {error}")
            else:
                preview = reply.replace("\n", " ")[:160]
                safe_print(f"  reply: {preview}")
                safe_print(f"  check: {language_detail}")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = args.out_dir / f"benchmark_{stamp}.json"
    csv_path = args.out_dir / f"benchmark_{stamp}.csv"
    latest_json = args.out_dir / "benchmark_latest.json"
    latest_csv = args.out_dir / "benchmark_latest.csv"

    payload = {
        "generated_at": stamp,
        "base_url": args.base_url,
        "total": len(results),
        "passed": passed,
        "failed": len(results) - passed,
        "results": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    latest_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    fieldnames = list(results[0].keys()) if results else []
    for path in (csv_path, latest_csv):
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)

    safe_print("")
    safe_print(f"Passed {passed}/{len(results)}")
    safe_print(f"Wrote {json_path}")
    safe_print(f"Wrote {csv_path}")
    return 0 if passed == len(results) else 1


def main() -> None:
    args = parse_args()
    try:
        raise SystemExit(run_benchmark(args))
    except KeyboardInterrupt:
        raise SystemExit(130) from None


if __name__ == "__main__":
    main()
