#!/usr/bin/env python3
"""Run upstream repo-preflight without copying its inspection logic.

Clones/updates nexus-ai-2045/repo-preflight into .tools/repo-preflight (gitignored)
at a pinned SHA and executes readiness_scan.py + consistency_gate.py against this
repository. Do not float to tip.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


UPSTREAM = "https://github.com/nexus-ai-2045/repo-preflight.git"
# art#29 / rpg#14 と同じ pin。検査ロジックはコピーせず、この SHA を fetch する。
REPO_PREFLIGHT_SHA = "f825268978228a3cfb2f5ecba16a74d424134b1a"
DEFAULT_CACHE = Path(".tools") / "repo-preflight"
ZERO_SHA = "0" * 40


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Invoke upstream repo-preflight against this repo.")
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--base-ref", default="origin/main")
    parser.add_argument("--intent", default=None)
    args = parser.parse_args(argv)

    base_ref = (args.base_ref or "").strip()
    if not base_ref or base_ref == ZERO_SHA:
        print("empty consistency base: fail-closed", file=sys.stderr)
        return 1

    repo = args.repo.resolve()
    cache = (repo / args.cache).resolve() if not args.cache.is_absolute() else args.cache.resolve()
    ensure_checkout(cache)

    scan_cmd = [sys.executable, str(cache / "scripts" / "readiness_scan.py"), "--repo", str(repo)]
    if args.intent:
        scan_cmd.extend(["--intent", args.intent, "--base-ref", base_ref])
    consistency_cmd = [
        sys.executable,
        str(cache / "scripts" / "consistency_gate.py"),
        "--repo",
        str(repo),
        "--base-ref",
        base_ref,
        "--require-config",
        "--require-mode",
        "shadow",
        "--json",
    ]

    print("==> repo-preflight readiness_scan")
    scan = subprocess.run(scan_cmd, cwd=repo, text=True, capture_output=True)
    print(scan.stdout)
    if scan.stderr:
        print(scan.stderr, file=sys.stderr)

    print("==> repo-preflight consistency_gate")
    consistency = subprocess.run(consistency_cmd, cwd=repo, text=True, capture_output=True)
    print(consistency.stdout)
    if consistency.stderr:
        print(consistency.stderr, file=sys.stderr)

    if not (cache / "scripts" / "readiness_scan.py").is_file():
        return 1
    if scan.returncode < 0 or consistency.returncode < 0:
        return 1

    try:
        payload = json.loads(consistency.stdout.strip()) if consistency.stdout.strip() else {}
    except json.JSONDecodeError:
        print("consistency_gate returned non-JSON: fail-closed", file=sys.stderr)
        return 1

    status = payload.get("status")
    mode = payload.get("mode")
    print(
        f"==> repo-preflight wrapper done "
        f"(readiness_rc={scan.returncode}, consistency_rc={consistency.returncode}, "
        f"status={status!r}, mode={mode!r}; not a merge approval)"
    )
    # shadow_findings are observational; tool_error/fail/missing config stop the gate.
    if status in {"pass", "shadow_findings"}:
        return 0
    return 1


def ensure_checkout(cache: Path) -> None:
    cache.parent.mkdir(parents=True, exist_ok=True)
    if (cache / ".git").is_dir():
        subprocess.run(
            ["git", "-C", str(cache), "fetch", "--depth", "1", "origin", REPO_PREFLIGHT_SHA],
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "-C", str(cache), "checkout", "--detach", REPO_PREFLIGHT_SHA],
            check=True,
            capture_output=True,
        )
    else:
        if cache.exists():
            # Stale non-git cache from older wrapper: replace with pinned clone.
            import shutil

            shutil.rmtree(cache)
        subprocess.run(
            ["git", "clone", "--no-checkout", UPSTREAM, str(cache)],
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "-C", str(cache), "checkout", "--detach", REPO_PREFLIGHT_SHA],
            check=True,
            capture_output=True,
        )
    head = subprocess.check_output(
        ["git", "-C", str(cache), "rev-parse", "HEAD"],
        text=True,
    ).strip()
    if head != REPO_PREFLIGHT_SHA:
        raise SystemExit(
            f"repo-preflight pin mismatch: expected {REPO_PREFLIGHT_SHA}, got {head}"
        )


if __name__ == "__main__":
    raise SystemExit(main())
