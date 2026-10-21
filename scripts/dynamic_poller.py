#!/usr/bin/env python3
"""Poll treasury document headers and download only changed circulars.

The manifest is deployment-owned and contains official bank treasury URLs. This
worker never invents products and never publishes an artifact to the API by
itself; promotion belongs to the reviewed database ingestion transaction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import ssl
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
POLL_HEADERS = {
    "User-Agent": "bd-banks-rates-api/1.0 treasury-poller",
    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json_atomic(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
        temporary = Path(handle.name)
    os.replace(temporary, path)


def poll_headers(url: str, timeout: int = 15) -> dict[str, Any]:
    request = urllib.request.Request(url, method="HEAD", headers=POLL_HEADERS)
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        return {
            "status_code": response.status,
            "etag": response.headers.get("ETag"),
            "last_modified": response.headers.get("Last-Modified"),
            "content_length": response.headers.get("Content-Length"),
            "content_type": response.headers.get("Content-Type"),
        }


def download_document(url: str, destination: Path, timeout: int = 60) -> str:
    request = urllib.request.Request(url, headers=POLL_HEADERS)
    context = ssl.create_default_context()
    digest = hashlib.sha256()
    total = 0
    destination.parent.mkdir(parents=True, exist_ok=True)

    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        with destination.open("wb") as output:
            while True:
                chunk = response.read(1024 * 256)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_DOCUMENT_BYTES:
                    raise ValueError("Treasury document exceeds the 20 MiB limit.")
                digest.update(chunk)
                output.write(chunk)
    return digest.hexdigest()


def poll_manifest(manifest_path: Path, state_path: Path, artifact_root: Path) -> list[dict[str, Any]]:
    manifest = read_json(manifest_path, [])
    if not isinstance(manifest, list):
        raise ValueError("Poll manifest must be a JSON array.")
    state = read_json(state_path, {})
    events: list[dict[str, Any]] = []

    for source in manifest:
        bank_code = str(source.get("bank_code", "")).strip().upper()
        url = str(source.get("document_url", "")).strip()
        if not bank_code or not url.startswith("https://"):
            raise ValueError("Each source requires a bank_code and HTTPS document_url.")

        previous = state.get(bank_code, {})
        now = utc_now()
        circuit_until = previous.get("circuit_open_until")
        if circuit_until and now < datetime.fromisoformat(circuit_until):
            events.append({"bank_code": bank_code, "event": "CIRCUIT_OPEN"})
            continue

        try:
            headers = poll_headers(url)
            changed = any(
                headers.get(key) is not None
                and headers.get(key) != previous.get(key)
                for key in ("etag", "last_modified", "content_length")
            )
            state[bank_code] = {
                **previous,
                **headers,
                "document_url": url,
                "consecutive_failures": 0,
                "circuit_open_until": None,
                "last_polled_at": now.isoformat(),
            }
            if not changed and previous:
                events.append({"bank_code": bank_code, "event": "UNCHANGED", **headers})
                continue

            staging = artifact_root / ".staging" / f"{bank_code}.pdf"
            digest = download_document(url, staging)
            final_path = artifact_root / bank_code / f"{digest}.pdf"
            final_path.parent.mkdir(parents=True, exist_ok=True)
            os.replace(staging, final_path)
            state[bank_code].update(
                {
                    "last_sha256": digest,
                    "last_artifact": str(final_path),
                    "last_downloaded_at": now.isoformat(),
                }
            )
            events.append(
                {
                    "bank_code": bank_code,
                    "event": "DOCUMENT_CHANGED",
                    "sha256": digest,
                    "artifact": str(final_path),
                    **headers,
                }
            )
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as error:
            failures = int(previous.get("consecutive_failures", 0)) + 1
            state[bank_code] = {
                **previous,
                "consecutive_failures": failures,
                "last_error": str(error),
                "last_polled_at": now.isoformat(),
                "circuit_open_until": (
                    (now + timedelta(minutes=30)).isoformat() if failures >= 3 else None
                ),
            }
            events.append({"bank_code": bank_code, "event": "POLL_FAILED", "error": str(error)})

    write_json_atomic(state_path, state)
    return events


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--state", type=Path, default=Path("var/poller-state.json"))
    parser.add_argument("--artifacts", type=Path, default=Path("var/circulars"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    events = poll_manifest(args.manifest, args.state, args.artifacts)
    rendered = json.dumps(events, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
