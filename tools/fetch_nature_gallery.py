#!/usr/bin/env python3
"""
tools/fetch_nature_gallery.py
120종 수목의 국가생물종지식정보시스템 도감 상세 페이지에서
이미지 갤러리 메타데이터(원본 URL, 썸네일, 설명, 촬영자, 일자, 지역 등)를
전수 수집하여 research/nature_images_manifest.json에 저장하는 스크립트.
"""

import json
import re
import urllib.request
import concurrent.futures
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NATURE_DATA_FILE = ROOT / "research" / "nature_data.json"
OUTPUT_FILE = ROOT / "research" / "nature_images_manifest.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def fetch_tree_gallery(tid: int, t_info: dict):
    name = t_info["name"]
    url = t_info.get("natureUrl", "")
    pilbk_no = t_info.get("plantPilbkNo", "")

    if not url or not pilbk_no:
        return tid, {
            "id": tid,
            "name": name,
            "plantPilbkNo": pilbk_no,
            "totalImages": 0,
            "images": []
        }

    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # fn_imgViewChange regex
        # fn_imgViewChange('thumb', 'desc', 'author', 'date', 'location', 'origUrl', idx, id)
        pattern = r"fn_imgViewChange\(\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]"
        matches = re.findall(pattern, html)

        images = []
        seen_urls = set()

        for idx, m in enumerate(matches):
            thumb_path = m[0].strip()
            desc = m[1].strip()
            author = m[2].strip()
            date = m[3].strip()
            location = m[4].strip()
            orig_path = m[5].strip()

            if not orig_path or orig_path in seen_urls:
                continue
            seen_urls.add(orig_path)

            orig_url = orig_path if orig_path.startswith("http") else f"https://www.nature.go.kr{orig_path}"
            thumb_url = thumb_path if thumb_path.startswith("http") else f"https://www.nature.go.kr{thumb_path}"

            images.append({
                "index": idx,
                "origUrl": orig_url,
                "thumbUrl": thumb_url,
                "origPath": orig_path,
                "desc": desc,
                "author": author,
                "date": date,
                "location": location
            })

        # Fallback: check #gallery ul.pictures li img if fn_imgViewChange returned empty
        if not images:
            gal_matches = re.findall(r'<img[^>]+data-original=[\'"]([^\'"]+)[\'"][^>]+src=[\'"]([^\'"]+)[\'"][^>]*alt=[\'"]([^\'"]*)[\'"]', html)
            for idx, (orig_path, thumb_path, alt) in enumerate(gal_matches):
                if orig_path in seen_urls:
                    continue
                seen_urls.add(orig_path)
                orig_url = orig_path if orig_path.startswith("http") else f"https://www.nature.go.kr{orig_path}"
                thumb_url = thumb_path if thumb_path.startswith("http") else f"https://www.nature.go.kr{thumb_path}"
                images.append({
                    "index": idx,
                    "origUrl": orig_url,
                    "thumbUrl": thumb_url,
                    "origPath": orig_path,
                    "desc": alt,
                    "author": "",
                    "date": "",
                    "location": ""
                })

        return tid, {
            "id": tid,
            "name": name,
            "plantPilbkNo": pilbk_no,
            "natureUrl": url,
            "totalImages": len(images),
            "images": images
        }

    except Exception as e:
        print(f"Error fetching tree {tid} ({name}): {e}")
        return tid, {
            "id": tid,
            "name": name,
            "plantPilbkNo": pilbk_no,
            "natureUrl": url,
            "totalImages": 0,
            "images": []
        }

def main():
    nature_data = json.loads(NATURE_DATA_FILE.read_text(encoding="utf-8"))
    print(f"Loaded {len(nature_data)} trees from {NATURE_DATA_FILE}. Fetching image galleries...")

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(fetch_tree_gallery, int(tid), tinfo): int(tid) for tid, tinfo in nature_data.items()}
        done = 0
        for f in concurrent.futures.as_completed(futures):
            tid, data = f.result()
            results[str(tid)] = data
            done += 1
            if done % 20 == 0 or done == len(nature_data):
                print(f"[{done}/{len(nature_data)}] galleries fetched...")

    # Sort by ID
    sorted_results = {str(i): results[str(i)] for i in range(1, len(nature_data) + 1)}

    OUTPUT_FILE.write_text(json.dumps(sorted_results, ensure_ascii=False, indent=2), encoding="utf-8")
    total_imgs = sum(d["totalImages"] for d in sorted_results.values())
    has_imgs = sum(1 for d in sorted_results.values() if d["totalImages"] > 0)
    print(f"\nCompleted! Total trees: {len(sorted_results)}, Trees with images: {has_imgs}/{len(sorted_results)}, Total images cataloged: {total_imgs}")
    print(f"Saved manifest to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
