#!/usr/bin/env python3
"""
tools/download_nature_photos.py
research/nature_curated_manifest.json의 479장 이미지를 다운로드하고
macOS sips 도구를 활용하여 웹 규격(최대 가로 960px, JPEG 82%)으로 최적화하여
web/assets/nature/ 디렉토리에 저장하는 스크립트.
"""

import json
import urllib.request
import subprocess
import concurrent.futures
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURATED_FILE = ROOT / "research" / "nature_curated_manifest.json"
TARGET_DIR = ROOT / "web" / "assets" / "nature"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def download_and_optimize(item: dict) -> tuple:
    url = item["origUrl"]
    rel_src = item["src"]
    dest_path = ROOT / "web" / rel_src

    if dest_path.exists() and dest_path.stat().st_size > 1024:
        return True, rel_src, "Already exists"

    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Download
    req = urllib.request.Request(url, headers=HEADERS)
    temp_path = dest_path.with_suffix(".tmp.jpg")
    success = False

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read()
                if len(content) > 1000:
                    temp_path.write_bytes(content)
                    success = True
                    break
        except Exception as e:
            time.sleep(1)

    if not success or not temp_path.exists():
        return False, rel_src, f"Failed to download from {url}"

    # 2. Optimize with macOS sips
    try:
        # Resize to max width 960px if larger
        cmd = ["sips", "--resampleWidth", "960", str(temp_path), "--out", str(dest_path)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        # Apply JPEG compression
        cmd2 = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", str(dest_path)]
        subprocess.run(cmd2, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        temp_path.unlink(missing_ok=True)
        return True, rel_src, "Optimized"
    except Exception as e:
        # Fallback if sips fails: rename temp to dest
        temp_path.rename(dest_path)
        return True, rel_src, f"Saved without sips: {e}"

def main():
    curated = json.loads(CURATED_FILE.read_text(encoding="utf-8"))
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    tasks = []
    for tid_str, t in curated.items():
        for img in t["images"]:
            tasks.append(img)

    print(f"Total curated images to process: {len(tasks)}")
    print(f"Target directory: {TARGET_DIR}")

    success_cnt = 0
    fail_cnt = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_and_optimize, img): img for img in tasks}
        done = 0
        for f in concurrent.futures.as_completed(futures):
            ok, src, msg = f.result()
            if ok:
                success_cnt += 1
            else:
                fail_cnt += 1
                print(f"[FAIL] {src}: {msg}")
            done += 1
            if done % 50 == 0 or done == len(tasks):
                print(f"[{done}/{len(tasks)}] photos processed...")

    print(f"\nDownload & Optimization Summary:")
    print(f"Successfully processed: {success_cnt}/{len(tasks)}")
    print(f"Failed: {fail_cnt}/{len(tasks)}")

    # Verify size
    total_size = sum(f.stat().st_size for f in TARGET_DIR.glob("*.jpg"))
    print(f"Total size of {TARGET_DIR.name}: {total_size / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    main()
