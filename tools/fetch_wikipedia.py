#!/usr/bin/env python3
"""
tools/fetch_wikipedia.py
120종 수목의 한국어 위키백과(ko.wikipedia.org) 및 영문 Wikipedia(en.wikipedia.org)
정식 문서 URL을 수집하고 검증하는 스크립트.
"""

import json
import re
import urllib.parse
import urllib.request
import concurrent.futures
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TREES_JSON = ROOT / "web" / "trees.json"
OUTPUT_JSON = ROOT / "research" / "wikipedia_data.json"

HEADERS = {
    "User-Agent": "Botany120App/1.0 (contact: study@example.org) Python-urllib"
}

def clean_binomial(sci_name: str) -> str:
    """학명에서 속명(Genus)과 종소명(Species)만 추출"""
    if not sci_name:
        return ""
    # 괄호 제거
    s = re.sub(r'\(.*?\)', '', sci_name).strip()
    words = s.split()
    if len(words) >= 2:
        return f"{words[0]} {words[1]}"
    return sci_name

def query_wiki(lang: str, title: str):
    """위키백과 API로 문서 존재 여부 및 언어 링크(langlinks) 확인"""
    encoded = urllib.parse.quote(title)
    url = f"https://{lang}.wikipedia.org/w/api.php?action=query&titles={encoded}&prop=info|langlinks&lllimit=10&format=json&redirects=1"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            data = json.loads(res.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            for pid, p in pages.items():
                if pid != "-1" and "missing" not in p:
                    canonical_title = p.get("title", title)
                    langlinks = {ll["lang"]: ll["*"] for ll in p.get("langlinks", [])}
                    return canonical_title, langlinks
    except Exception as e:
        # print(f"Error querying {lang}:{title} -> {e}")
        pass
    return None, {}

def search_wiki(lang: str, query: str):
    """검색 API로 가장 유사한 문서 제목 찾기"""
    encoded = urllib.parse.quote(query)
    url = f"https://{lang}.wikipedia.org/w/api.php?action=opensearch&search={encoded}&limit=3&namespace=0&format=json"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            data = json.loads(res.read().decode("utf-8"))
            if len(data) >= 2 and data[1]:
                return data[1][0]
    except Exception:
        pass
    return None

def process_tree(t):
    tid = t["id"]
    name = t["name"]
    sci = t.get("scientificName", "")
    binomial = clean_binomial(sci)
    genus = binomial.split()[0] if binomial else ""
    aliases = t.get("aliases", [])

    ko_title = None
    en_title = None
    ko_langlinks = {}

    # 1. 한국어 위키 검색 (수목 이름 -> 이명 -> 학명)
    for candidate in [name] + aliases:
        cand_title, links = query_wiki("ko", candidate)
        if cand_title:
            ko_title = cand_title
            ko_langlinks = links
            break

    if not ko_title and binomial:
        cand_title, links = query_wiki("ko", binomial)
        if cand_title:
            ko_title = cand_title
            ko_langlinks = links

    if not ko_title:
        # 오픈 검색 시도
        search_res = search_wiki("ko", name)
        if search_res:
            cand_title, links = query_wiki("ko", search_res)
            if cand_title:
                ko_title = cand_title
                ko_langlinks = links

    # 2. 영문 위키 검색
    # 2-1. 한국어 위키의 langlinks(en)에 매핑된 경우
    if "en" in ko_langlinks:
        en_title = ko_langlinks["en"]

    # 2-2. 학명(binomial)으로 직접 검색
    if not en_title and binomial:
        cand_title, links = query_wiki("en", binomial)
        if cand_title:
            en_title = cand_title
            if not ko_title and "ko" in links:
                ko_title = links["ko"]

    # 2-3. 전체 학명(variety 포함)으로 시도
    if not en_title and "var." in sci:
        var_name = sci.split("var.")[0].strip() + " var. " + sci.split("var.")[1].strip().split()[0]
        cand_title, links = query_wiki("en", var_name)
        if cand_title:
            en_title = cand_title

    # 2-4. 영어 일반명(englishName)으로 시도
    if not en_title and t.get("englishName"):
        for eng in t["englishName"].split(","):
            eng = eng.strip()
            if not eng:
                continue
            cand_title, links = query_wiki("en", eng)
            if cand_title:
                en_title = cand_title
                break

    # 2-5. 오픈 검색 시도
    if not en_title and binomial:
        search_res = search_wiki("en", binomial)
        if search_res:
            cand_title, links = query_wiki("en", search_res)
            if cand_title:
                en_title = cand_title

    # 2-6. 속명(Genus)으로 최종 대체 (종 문서가 없을 경우)
    if not en_title and genus:
        cand_title, _ = query_wiki("en", genus)
        if cand_title:
            en_title = cand_title

    if not ko_title and genus:
        cand_title, _ = query_wiki("ko", genus)
        if cand_title:
            ko_title = cand_title

    # URL 생성
    wiki_ko_url = f"https://ko.wikipedia.org/wiki/{urllib.parse.quote(ko_title.replace(' ', '_'))}" if ko_title else None
    wiki_en_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(en_title.replace(' ', '_'))}" if en_title else None

    return {
        "id": tid,
        "name": name,
        "scientificName": sci,
        "koTitle": ko_title,
        "enTitle": en_title,
        "wikiKoUrl": wiki_ko_url,
        "wikiEnUrl": wiki_en_url
    }

def main():
    with open(TREES_JSON, "r", encoding="utf-8") as f:
        trees = json.load(f)

    print(f"Total trees: {len(trees)}")
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(process_tree, t): t for t in trees}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            results.append(res)
            print(f"[{res['id']:03d}] {res['name']} -> KO: {res['koTitle']} | EN: {res['enTitle']}")

    results.sort(key=lambda x: x["id"])
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    ko_found = sum(1 for r in results if r["wikiKoUrl"])
    en_found = sum(1 for r in results if r["wikiEnUrl"])
    print("=" * 50)
    print(f"Done! Saved to {OUTPUT_JSON}")
    print(f"Korean Wikipedia mapped: {ko_found} / {len(trees)} ({ko_found/len(trees)*100:.1f}%)")
    print(f"English Wikipedia mapped: {en_found} / {len(trees)} ({en_found/len(trees)*100:.1f}%)")

if __name__ == "__main__":
    main()
