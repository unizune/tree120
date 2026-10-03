#!/usr/bin/env python3
"""
tools/fetch_nature.py
산림청 국립수목원 국가생물종지식정보시스템(nature.go.kr)에서
120종 수목의 정식 식물도감 상세 URL(selectPlantPilbkDtl.do?plantPilbkNo=...)을
수집하고 검증하는 스크립트.
"""

import json
import re
import urllib.parse
import urllib.request
import concurrent.futures
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TREES_JSON = ROOT / "web" / "trees.json"
OUTPUT_JSON = ROOT / "research" / "nature_data.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_binomial(sci_name: str) -> str:
    if not sci_name:
        return ""
    s = re.sub(r'\(.*?\)', '', sci_name).strip()
    words = s.split()
    if len(words) >= 2:
        return f"{words[0]} {words[1]}"
    return sci_name

def search_nature(query: str):
    params = urllib.parse.urlencode({
        "kwd": query,
        "orgId": "kbi",
        "mn": "KFS_28",
        "pageNum": "1",
        "cate": "TOTAL",
        "category": "TOTAL"
    })
    url = f"https://www.nature.go.kr/kbi/idx/searchIndex.do?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            # <a href="/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo=40752" ...>가막살나무</a>
            matches = re.findall(r'selectPlantPilbkDtl\.do\?plantPilbkNo=(\d+)[^>]*>([\s\S]*?)</a>', html)
            cleaned = []
            for pid, raw_title in matches:
                title = re.sub(r'<[^>]+>', '', raw_title).strip()
                cleaned.append((pid, title))
            return cleaned
    except Exception as e:
        # print(f"Error searching {query}: {e}")
        return []

OVERRIDES = {
    21: {  # 노랑말채나무 (Cornus alba 'Aurea')
        "plantPilbkNo": "37816",
        "name": "노랑말채나무",
        "matchedTitle": "흰말채나무 '아우레아'",
        "natureUrl": "https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo=37816"
    }
}

def resolve_tree(t):
    tid = t["id"]
    if tid in OVERRIDES:
        return tid, OVERRIDES[tid]

    name = t["name"]
    aliases = t.get("aliases", [])
    sci = t.get("scientificName", "")
    binomial = clean_binomial(sci)

    # 1. 수목명 검색
    results = search_nature(name)
    for pid, title in results:
        if title == name:
            return tid, {
                "plantPilbkNo": pid,
                "name": name,
                "matchedTitle": title,
                "natureUrl": f"https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo={pid}"
            }

    # 2. 이명 검색
    for alias in aliases:
        a_results = search_nature(alias)
        for pid, title in a_results:
            if title == alias or title == name:
                return tid, {
                    "plantPilbkNo": pid,
                    "name": name,
                    "matchedTitle": title,
                    "natureUrl": f"https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo={pid}"
                }

    # 3. 학명(속명 종소명) 검색
    if binomial:
        b_results = search_nature(binomial)
        for pid, title in b_results:
            if title == name:
                return tid, {
                    "plantPilbkNo": pid,
                    "name": name,
                    "matchedTitle": title,
                    "natureUrl": f"https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo={pid}"
                }

    # 4. 부분 일치 검색 (이름으로 시작하거나 포함)
    for pid, title in results:
        if title.startswith(name) or name in title:
            return tid, {
                "plantPilbkNo": pid,
                "name": name,
                "matchedTitle": title,
                "natureUrl": f"https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo={pid}"
            }

    # 5. 검색 결과 첫 번째 항목 (있다면)
    if results:
        pid, title = results[0]
        return tid, {
            "plantPilbkNo": pid,
            "name": name,
            "matchedTitle": title,
            "natureUrl": f"https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtl.do?plantPilbkNo={pid}"
        }

    # 6. 매핑 실패 시 자세히 찾기 기본 URL
    return tid, {
        "plantPilbkNo": "",
        "name": name,
        "matchedTitle": "",
        "natureUrl": "https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtlList.do"
    }

def main():
    trees = json.loads(TREES_JSON.read_text(encoding="utf-8"))
    print(f"Loaded {len(trees)} trees. Starting parallel search on nature.go.kr...")

    mapped = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(resolve_tree, t): t for t in trees}
        done_cnt = 0
        for future in concurrent.futures.as_completed(futures):
            t = futures[future]
            tid, data = future.result()
            mapped[str(tid)] = data
            done_cnt += 1
            if done_cnt % 20 == 0 or done_cnt == len(trees):
                print(f"[{done_cnt}/{len(trees)}] processed...")

    # Sort by ID
    sorted_mapped = {str(i): mapped[str(i)] for i in range(1, len(trees) + 1)}

    OUTPUT_JSON.write_text(json.dumps(sorted_mapped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved to {OUTPUT_JSON}")

    exact_count = sum(1 for d in sorted_mapped.values() if d["plantPilbkNo"] and d["name"] == d["matchedTitle"])
    matched_count = sum(1 for d in sorted_mapped.values() if d["plantPilbkNo"])
    print(f"Exact name match: {exact_count}/120, Mapped total: {matched_count}/120")

    unmatched = [d for d in sorted_mapped.values() if not d["plantPilbkNo"] or d["name"] != d["matchedTitle"]]
    if unmatched:
        print("\nItems with non-exact or default mapping:")
        for item in unmatched:
            print(f"  {item['name']} -> ID: {item['plantPilbkNo']} ({item['matchedTitle']})")

if __name__ == "__main__":
    main()
