#!/usr/bin/env python3
"""
tools/label_nature_photos.py
국가생물종지식정보시스템 갤러리 메타데이터를 기반으로
5대 형태학적 카테고리(잎, 꽃, 열매, 줄기·수형, 기타)로 레이블링하고,
수종당 4~5장의 최적 사진을 엄선(스마트 큐레이션)하여
research/nature_curated_manifest.json에 저장하는 스크립트.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_MANIFEST_FILE = ROOT / "research" / "nature_images_manifest.json"
OUTPUT_FILE = ROOT / "research" / "nature_curated_manifest.json"

TAG_HIERARCHY = ['꽃', '잎', '열매', '줄기·수형', '기타']

def classify_tag(desc: str, date: str, path: str) -> str:
    desc = desc.strip()
    
    # 1. 키워드 기반 정밀 판별
    if any(k in desc for k in ['꽃', '화서', '꽃차례', '화관', '개화', '꽃대', '암술', '수술']):
        return '꽃'
    if any(k in desc for k in ['열매', '구과', '열매이삭', '종자', '씨앗', '과실', '협과']):
        return '열매'
    if any(k in desc for k in ['잎', '엽병', '잎자루', '단풍', '엽신', '잎새', '새순']):
        return '잎'
    if any(k in desc for k in ['수형', '줄기', '가지', '수피', '나무껍질', '전경', '전체이미지', '줄기이미지', '수피이미지', '목본']):
        return '줄기·수형'
    if any(k in desc for k in ['겨울눈', '동아', '가시', '피목', '포자', '뿌리', '꽃눈']):
        return '기타'

    # 2. 경로 및 파일명 힌트
    lower_path = path.lower()
    if 'leaf' in lower_path:
        return '잎'
    if 'flower' in lower_path:
        return '꽃'
    if 'fruit' in lower_path:
        return '열매'
    if 'bark' in lower_path or 'stem' in lower_path:
        return '줄기·수형'

    # 3. 촬영일자(월) 기반 생태 주기 보조 분류
    if len(date) >= 6:
        try:
            m = int(date[4:6])
            if m in [3, 4, 5]:
                return '꽃'
            elif m in [6, 7]:
                return '잎'
            elif m in [8, 9, 10]:
                return '열매'
            elif m in [11, 12, 1, 2]:
                return '줄기·수형'
        except ValueError:
            pass

    return '줄기·수형'

def format_date(d: str) -> str:
    if len(d) == 8 and d.isdigit():
        return f"{d[:4]}-{d[4:6]}-{d[6:]}"
    return d

def curate_images():
    raw_manifest = json.loads(RAW_MANIFEST_FILE.read_text(encoding="utf-8"))
    print(f"Loaded {len(raw_manifest)} trees from {RAW_MANIFEST_FILE}...")

    curated = {}
    total_curated_photos = 0
    tag_counts = {t: 0 for t in TAG_HIERARCHY}

    for tid_str, t_data in raw_manifest.items():
        tid = int(tid_str)
        name = t_data["name"]
        images = t_data.get("images", [])

        if not images:
            curated[tid_str] = {
                "id": tid,
                "name": name,
                "plantPilbkNo": t_data.get("plantPilbkNo", ""),
                "images": []
            }
            continue

        # Group images by classified tag with scoring
        grouped = {t: [] for t in TAG_HIERARCHY}
        for img in images:
            tag = classify_tag(img["desc"], img["date"], img["origPath"])
            score = 0
            # 우선순위: 설명이 명시되어 있는 경우 최고점
            if img["desc"]:
                score += 20
            # 국립수목원 등 공식 촬영자/기관이 있는 경우
            if img["author"]:
                score += 5
            # 촬영일자가 명시된 경우
            if img["date"]:
                score += 3
            # 첫 번째 또는 작은 번호의 대표 이미지 가점
            if img["index"] < 5:
                score += 2

            grouped[tag].append((score, img))

        for t in TAG_HIERARCHY:
            grouped[t].sort(key=lambda x: x[0], reverse=True)

        # 1차 선택: 5대 부위별로 가장 점수가 높은 사진 1장씩 선별
        selected = []
        for tag in TAG_HIERARCHY:
            if grouped[tag]:
                _, top_img = grouped[tag].pop(0)
                selected.append((tag, top_img))

        # 2차 선택: 4장 미만인 경우 나머지 그룹에서 점수가 높은 순으로 보충 (최대 5장)
        if len(selected) < 4:
            remaining = []
            for tag in TAG_HIERARCHY:
                for score, img in grouped[tag]:
                    remaining.append((tag, score, img))
            remaining.sort(key=lambda x: x[1], reverse=True)

            while len(selected) < 4 and remaining:
                tag, _, img = remaining.pop(0)
                selected.append((tag, img))

        # 5장 초과 제한 (수종당 4~5장 유지)
        selected = selected[:5]

        # 정제된 TreeImage 객체 목록 생성
        tree_images = []
        for seq, (tag, raw_img) in enumerate(selected, start=1):
            src_path = f"assets/nature/nature_{tid:03d}_{seq:02d}.jpg"
            desc_text = raw_img["desc"].strip()
            if not desc_text:
                desc_text = f"{name} {tag} 형태"

            formatted_date = format_date(raw_img["date"])
            author_text = raw_img["author"].strip() or "국립수목원"

            tree_images.append({
                "src": src_path,
                "tag": tag,
                "desc": desc_text,
                "origUrl": raw_img["origUrl"],
                "author": author_text,
                "date": formatted_date,
                "location": raw_img["location"].strip(),
                "source": "국가생물종지식정보시스템"
            })
            tag_counts[tag] += 1

        curated[tid_str] = {
            "id": tid,
            "name": name,
            "plantPilbkNo": t_data.get("plantPilbkNo", ""),
            "natureUrl": t_data.get("natureUrl", ""),
            "totalImages": len(tree_images),
            "images": tree_images
        }
        total_curated_photos += len(tree_images)

    sorted_curated = {str(i): curated[str(i)] for i in range(1, len(raw_manifest) + 1)}
    OUTPUT_FILE.write_text(json.dumps(sorted_curated, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nCurated manifest created successfully!")
    print(f"Total trees: {len(sorted_curated)}")
    print(f"Total curated nature images: {total_curated_photos}")
    print(f"Average images per tree: {total_curated_photos / len(sorted_curated):.2f}")
    print(f"Tag distribution: {tag_counts}")
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    curate_images()
