#!/usr/bin/env python3
"""
Copies FormationFlight firmware from GitHub releases into the docs site, for
the web installer (docs/installer/).

The installer cannot read release assets from GitHub itself: a browser page is
not allowed to fetch them (no CORS headers on the download redirect). So the
docs build fetches them server-side and publishes them with the site, under
installer/firmware/<tag>/, next to a releases.json listing what is there.

Only releases built for the installer are taken: those carrying an index.json
(the FormationFlight build writes one; see scripts/flasher_manifest.py there).
That is the newest few stable releases, plus the rolling `development`
prerelease when there is one.

    python scripts/fetch_firmware.py [--out docs/installer/firmware] [--stable 3]

Set GITHUB_TOKEN to avoid the unauthenticated API rate limit.
"""

import argparse
import json
import os
import shutil
import sys
import urllib.request

REPO = "FormationFlight/FormationFlight"
API = f"https://api.github.com/repos/{REPO}/releases?per_page=50"
DEVELOPMENT_TAG = "development"


def request(url, accept="application/vnd.github+json"):
    headers = {"Accept": accept, "User-Agent": "formationflight-docs"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60)


def fetchJson(url):
    with request(url) as r:
        return json.load(r)


def download(asset, path):
    # The asset API URL with an octet-stream Accept follows to the file itself.
    with request(asset["url"], accept="application/octet-stream") as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--out", default="docs/installer/firmware")
    p.add_argument("--stable", type=int, default=3, help="how many stable releases to keep")
    args = p.parse_args()

    releases = fetchJson(API)
    usable = [r for r in releases
              if not r.get("draft") and any(a["name"] == "index.json" for a in r.get("assets", []))]
    stable = [r for r in usable if not r.get("prerelease")][:args.stable]
    development = [r for r in usable if r["tag_name"] == DEVELOPMENT_TAG][:1]
    chosen = stable + development

    shutil.rmtree(args.out, ignore_errors=True)
    os.makedirs(args.out)
    listed = []
    for release in chosen:
        tag = release["tag_name"]
        assets = {a["name"]: a for a in release["assets"]}
        folder = os.path.join(args.out, tag)
        os.makedirs(folder)
        download(assets["index.json"], os.path.join(folder, "index.json"))
        with open(os.path.join(folder, "index.json")) as f:
            index = json.load(f)
        # Exactly the files the index flashes, and nothing else on the release.
        wanted = sorted({part["file"] for env in index["envs"].values() for part in env["parts"]})
        missing = [name for name in wanted if name not in assets]
        if missing:
            print(f"{tag}: skipped, index.json names files the release lacks: {missing}",
                  file=sys.stderr)
            shutil.rmtree(folder)
            continue
        for name in wanted:
            download(assets[name], os.path.join(folder, name))
        listed.append({
            "tag": tag,
            "name": "Development build" if tag == DEVELOPMENT_TAG else (release.get("name") or tag),
            "prerelease": bool(release.get("prerelease")),
            "date": release.get("published_at") or release.get("created_at"),
            "commit": index.get("commit", ""),
            "url": release["html_url"],
        })
        print(f"{tag}: {len(wanted)} files, {len(index['devices'])} boards")

    with open(os.path.join(args.out, "releases.json"), "w") as f:
        json.dump({"releases": listed}, f, indent=1)
    if not listed:
        print("no release built for the installer yet; it will say so", file=sys.stderr)


if __name__ == "__main__":
    main()
