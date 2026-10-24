#!/usr/bin/env python3
"""Run upstream repo-preflight without copying its inspection logic.

Canonical source: nexus-ai-2045/repo-preflight (public).
Fetches the exact pinned commit at run time (no vendored copy in this repo).
Verifies the fetched commit object equals REPO_PREFLIGHT_SHA and that the release
tag still peels to it, validates every archive member, safely extracts it into
.tools/repo-preflight, then executes readiness_scan.py + consistency_gate.py.
Do not copy inspection logic.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path, PurePosixPath


# 公開上流の正式release v0.10.0 の commit を実行時に取り寄せる。検査ロジックは手編集しない。
REPO_PREFLIGHT_SHA = "5b7c774deb8e9abcf0fce0c5f39ec1c1f3a894f3"
REPO_PREFLIGHT_TAG = "v0.10.0"
REPO_PREFLIGHT_URL = "https://github.com/nexus-ai-2045/repo-preflight.git"
# Test hook only: a local archive whose SHA-256 must equal REPO_PREFLIGHT_ARCHIVE_SHA256.
# None (the default) means fetch the pinned commit from REPO_PREFLIGHT_URL.
SOURCE_ARCHIVE: Path | None = None
REPO_PREFLIGHT_ARCHIVE_SHA256: str | None = None
SOURCE_PREFIX = "repo-preflight"
DEFAULT_CACHE = Path(".tools") / "repo-preflight"
ZERO_SHA = "0" * 40


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Invoke upstream repo-preflight against this repo.")
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--base-ref", default="origin/main")
    parser.add_argument("--intent", default=None)
    parser.add_argument("--prepare-only", action="store_true", help="Fetch, verify and prepare the pinned source cache without running scanners.")
    args = parser.parse_args(argv)

    base_ref = (args.base_ref or "").strip()
    if not base_ref or base_ref == ZERO_SHA:
        print("empty consistency base: fail-closed", file=sys.stderr)
        return 1

    repo = args.repo.resolve()
    cache = (repo / args.cache).absolute() if not args.cache.is_absolute() else args.cache.absolute()
    try:
        ensure_checkout(cache)
    except (OSError, ValueError, tarfile.TarError, subprocess.SubprocessError) as exc:
        print(f"pinned source rejected: {exc}", file=sys.stderr)
        return 1
    if args.prepare_only:
        print(f"pinned source prepared: {REPO_PREFLIGHT_SHA} ({REPO_PREFLIGHT_TAG})")
        return 0
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    scan_cmd = [
        sys.executable,
        str(cache / "scripts" / "readiness_scan.py"),
        "--repo",
        str(repo),
    ]
    if args.intent in {"push", "open_pr", "merge"}:
        # Canonical target-diff intents reject --consistency-base-ref.
        scan_cmd.extend(["--intent", args.intent, "--base-ref", base_ref])
    else:
        # Plain/release scans match the workflow; target-diff intents use their own gate.
        scan_cmd.extend(["--release", "--consistency-base-ref", base_ref])
        if args.intent:
            scan_cmd.extend(["--intent", args.intent])
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
    scan = subprocess.run(scan_cmd, cwd=repo, text=True, capture_output=True, env=env)
    print(scan.stdout)
    if scan.stderr:
        print(scan.stderr, file=sys.stderr)

    print("==> repo-preflight consistency_gate")
    consistency = subprocess.run(consistency_cmd, cwd=repo, text=True, capture_output=True, env=env)
    print(consistency.stdout)
    if consistency.stderr:
        print(consistency.stderr, file=sys.stderr)

    if not (cache / "scripts" / "readiness_scan.py").is_file():
        return 1
    if scan.returncode not in (0, 1) or consistency.returncode not in (0, 1):
        return 1

    try:
        scan_payload = json.loads(scan.stdout.strip()) if scan.stdout.strip() else {}
        payload = json.loads(consistency.stdout.strip()) if consistency.stdout.strip() else {}
    except json.JSONDecodeError:
        print("scanner returned non-JSON: fail-closed", file=sys.stderr)
        return 1

    expected_schema = "repo-preflight.dialogue/v3" if args.intent else "repo-preflight.scan/v3"
    if not isinstance(scan_payload, dict) or scan_payload.get("schema") != expected_schema:
        print("readiness_scan schema invalid: fail-closed", file=sys.stderr)
        return 1
    if args.intent:
        # dialogue/v3 wraps the actual scan/v3 result. Human questions are observations;
        # the outer blocked status must never hide an embedded tool_error or missing scan.
        if (scan_payload.get("intent") != args.intent or scan_payload.get("status") not in
                ("blocked", "needs_human_input", "ready_after_confirmation")):
            print("readiness_scan dialogue invalid: fail-closed", file=sys.stderr)
            return 1
        scan_payload = scan_payload.get("scan")
    if (not isinstance(scan_payload, dict) or scan_payload.get("schema") != "repo-preflight.scan/v3"
            or scan_payload.get("status") not in ("pass", "blocked")):
        print("readiness_scan missing/invalid scan or tool error: fail-closed", file=sys.stderr)
        return 1
    if not isinstance(payload, dict):
        print("consistency_gate returned invalid JSON: fail-closed", file=sys.stderr)
        return 1
    status = payload.get("status")
    mode = payload.get("mode")
    print(
        f"==> repo-preflight wrapper done "
        f"(readiness_rc={scan.returncode}, consistency_rc={consistency.returncode}, "
        f"status={status!r}, mode={mode!r}; not a merge approval)"
    )
    # shadow_findings are observational; tool_error/fail/missing config stop the gate.
    if status in ("pass", "shadow_findings"):
        return 0
    return 1


def _clean_git_env() -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env["GIT_TERMINAL_PROMPT"] = "0"
    return env


def fetch_pinned_archive() -> bytes:
    """Fetch exactly REPO_PREFLIGHT_SHA from the public upstream and return a tar archive.

    Integrity anchor: git verifies the received objects against the requested commit id,
    and the commit id is re-checked after fetch. The release tag must still peel to it.
    """
    env = _clean_git_env()
    remote = subprocess.run(
        ["git", "ls-remote", "--tags", REPO_PREFLIGHT_URL, f"refs/tags/{REPO_PREFLIGHT_TAG}^{{}}"],
        text=True, capture_output=True, env=env, timeout=120, check=True,
    ).stdout.split()
    if not remote or remote[0] != REPO_PREFLIGHT_SHA:
        raise ValueError(f"release tag {REPO_PREFLIGHT_TAG} does not peel to pinned SHA")
    with tempfile.TemporaryDirectory(prefix="repo-preflight-fetch-") as tmp:
        def git(*args: str, text: bool = True) -> subprocess.CompletedProcess:
            return subprocess.run(["git", *args], cwd=tmp, text=text, capture_output=True,
                                  env=env, timeout=300, check=True)
        git("init", "-q")
        git("fetch", "-q", "--depth", "1", "--no-tags", REPO_PREFLIGHT_URL, REPO_PREFLIGHT_SHA)
        fetched = git("rev-parse", "--verify", "FETCH_HEAD^{commit}").stdout.strip()
        if fetched != REPO_PREFLIGHT_SHA:
            raise ValueError("fetched commit does not match pinned SHA")
        return git("archive", "--format=tar.gz", f"--prefix={SOURCE_PREFIX}/", REPO_PREFLIGHT_SHA,
                   text=False).stdout


def load_archive() -> bytes:
    if SOURCE_ARCHIVE is None:
        return fetch_pinned_archive()
    if SOURCE_ARCHIVE.is_symlink():
        raise ValueError("source archive must not be a symlink")
    archive_bytes = SOURCE_ARCHIVE.read_bytes()
    if hashlib.sha256(archive_bytes).hexdigest() != REPO_PREFLIGHT_ARCHIVE_SHA256:
        raise ValueError("source archive SHA-256 mismatch")
    return archive_bytes


def ensure_checkout(cache: Path) -> None:
    """Verify the pinned source before any cache write; preserve stale caches."""
    if cache.is_symlink():
        raise ValueError("source cache must not be a symlink")
    archive_bytes = load_archive()
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
        entries = []
        seen = set()
        for member in archive.getmembers():
            parts = PurePosixPath(member.name).parts
            if (not parts or parts[0] != SOURCE_PREFIX or ".." in parts
                    or "\\" in member.name or ":" in member.name
                    or member.name.startswith("/") or not (member.isfile() or member.isdir())):
                raise ValueError("unsafe archive member")
            relative = Path(*parts[1:])
            if not parts[1:]:
                if not member.isdir():
                    raise ValueError("archive prefix must be a directory")
                continue
            if relative in seen:
                raise ValueError("duplicate archive member")
            seen.add(relative)
            entries.append((relative, member))
        files = {rel: member for rel, member in entries if member.isfile()}
        if not {Path("scripts/readiness_scan.py"), Path("scripts/consistency_gate.py")} <= files.keys():
            raise ValueError("required canonical scanners missing")
        if any(parent in files for rel in seen for parent in rel.parents):
            raise ValueError("archive file/directory collision")
        if cache.is_symlink():
            raise ValueError("source cache must not be a symlink")
        if cache.exists():
            if not cache.is_dir():
                raise ValueError("source cache is not a directory; preserved")
            actual = set()
            for path in cache.rglob("*"):
                if path.is_symlink():
                    raise ValueError("source cache contains a symlink; preserved")
                if not (path.is_dir() or path.is_file()):
                    raise ValueError("source cache contains a special file; preserved")
                if path.is_file():
                    actual.add(path.relative_to(cache))
            if actual != files.keys():
                raise ValueError("stale source cache; preserved; choose another --cache")
            for rel, member in files.items():
                if (cache / rel).read_bytes() != archive.extractfile(member).read():
                    raise ValueError("source cache bytes mismatch; preserved")
            return
        # All member paths/types are validated before the first write. No extractall.
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.mkdir()  # Exclusive creation: never replace or delete an existing cache.
        for rel, member in entries:
            target = cache / rel
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, target.open("xb") as destination:
                    shutil.copyfileobj(source, destination)
                target.chmod(0o644)


if __name__ == "__main__":
    raise SystemExit(main())
