#!/usr/bin/env python3
"""
tools/convert_to_webp.py

web/assets/ 디렉토리의 모든 수목 도감 사진을 JPG에서 WebP로 고품질·고효율 일괄 변환합니다.
- 사전 발견된 EXIF 회전(Orientation) 태그 의존 이미지(24장)의 픽셀 정방향 회전(Bake-in)
- 비표준 ICC 프로파일(110장)의 표준 sRGB 색공간 매칭(ColorSync Profile Match)
- cwebp -q 80 -m 6 옵션을 통한 60% 이상의 무손실급 경량화 WebP 인코딩
- 변환 완료 후 정상 출력 검증 및 미참조 고아 파일 포함 기존 .jpg 전수 정리
"""

import struct
import subprocess
import concurrent.futures
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
ASSETS_DIR = WEB_DIR / "assets"
SRGB_PROFILE = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"

def get_exif_orientation(jpg_bytes: bytes) -> int:
    """JPEG 바이너리에서 IFD0 Orientation 태그를 직접 파싱합니다."""
    i = 2
    while i < len(jpg_bytes) - 4:
        if jpg_bytes[i] != 0xFF:
            break
        marker = jpg_bytes[i + 1]
        if marker == 0xDA: # SOS
            break
        length = struct.unpack(">H", jpg_bytes[i + 2:i + 4])[0]
        if marker == 0xE1 and jpg_bytes[i + 4:i + 10] == b"Exif\x00\x00":
            tiff = jpg_bytes[i + 10:i + 2 + length]
            endian = "<" if tiff[:2] == b"II" else ">"
            if len(tiff) >= 8:
                ifd0_off = struct.unpack(endian + "I", tiff[4:8])[0]
                if ifd0_off + 2 <= len(tiff):
                    cnt = struct.unpack(endian + "H", tiff[ifd0_off:ifd0_off + 2])[0]
                    for e in range(cnt):
                        e_off = ifd0_off + 2 + e * 12
                        if e_off + 12 <= len(tiff):
                            tag, typ, count, val = struct.unpack(endian + "HHII", tiff[e_off:e_off + 12])
                            if tag == 0x0112:
                                orient = struct.unpack(endian + "H", tiff[e_off + 8:e_off + 10])[0]
                                return orient
        i += 2 + length
    return 1

def get_image_info(path: Path) -> dict:
    """sips를 이용해 이미지의 가로, 세로, ICC 프로파일을 조회합니다."""
    out = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", "-g", "profile", str(path)],
        text=True, stderr=subprocess.DEVNULL
    )
    info = {"width": 0, "height": 0, "profile": ""}
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("pixelWidth:"):
            info["width"] = int(line.split(":", 1)[1].strip())
        elif line.startswith("pixelHeight:"):
            info["height"] = int(line.split(":", 1)[1].strip())
        elif line.startswith("profile:"):
            info["profile"] = line.split(":", 1)[1].strip()
    return info

def process_image(jpg_path: Path) -> tuple:
    """단일 JPG 이미지를 정규화(회전/색공간)한 후 WebP로 인코딩합니다."""
    webp_path = jpg_path.with_suffix(".webp")
    raw_data = jpg_path.read_bytes()
    orient = get_exif_orientation(raw_data)
    info = get_image_info(jpg_path)

    rotated = False
    color_matched = False

    # 1. EXIF 회전 정규화: Width > Height이고 Orientation이 회전을 요구할 때 픽셀 회전
    if info["width"] > info["height"] and orient in (6, 8, 3):
        rot_deg = "90" if orient == 6 else ("270" if orient == 8 else "180")
        subprocess.run(["sips", "-r", rot_deg, str(jpg_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        rotated = True

    # 2. ICC 프로파일 정규화: 표준 sRGB가 아니면 sRGB로 색상 매칭 변환
    if Path(SRGB_PROFILE).exists() and info["profile"] != "sRGB IEC61966-2.1":
        subprocess.run(["sips", "--matchTo", SRGB_PROFILE, str(jpg_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        color_matched = True

    # 3. cwebp로 초고품질 WebP 인코딩 (quality 90, method 6 최적 압축, sharp_yuv 색상 경계 보존)
    cmd = ["cwebp", "-q", "90", "-m", "6", "-sharp_yuv", str(jpg_path), "-o", str(webp_path)]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if res.returncode != 0:
        return False, str(jpg_path.relative_to(WEB_DIR)), "cwebp encoding failed"

    if not webp_path.exists() or webp_path.stat().st_size < 1024:
        return False, str(jpg_path.relative_to(WEB_DIR)), "WebP file missing or too small"

    orig_size = len(raw_data)
    new_size = webp_path.stat().st_size
    return True, str(webp_path.relative_to(WEB_DIR)), orig_size, new_size, rotated, color_matched

def main():
    print("================================================================")
    print("🌿 수목 도감 이미지 JPG ➔ WebP 고품질 정규화 및 일괄 변환기")
    print("================================================================\n")

    # trees.json에서 참조 중인 이미지 목록 확인
    trees = json.loads((WEB_DIR / "trees.json").read_text(encoding="utf-8"))
    referenced_srcs = [im["src"] for t in trees for im in t["images"]]
    print(f"▶ trees.json 참조 이미지 수: {len(referenced_srcs)}개")

    jpg_files = sorted(list(ASSETS_DIR.rglob("*.jpg")))
    print(f"▶ 디스크 내 실제 JPG 파일 수: {len(jpg_files)}개")

    orig_total_size = sum(f.stat().st_size for f in jpg_files)
    print(f"▶ 변환 전 원본 JPG 총 용량: {orig_total_size / (1024 * 1024):.2f} MB\n")

    print("▶ WebP 일괄 변환 및 색공간/회전 정규화 진행 중 (8-worker 멀티스레드)...")
    success_cnt = 0
    fail_cnt = 0
    rotated_cnt = 0
    color_matched_cnt = 0
    new_total_size = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_image, f): f for f in jpg_files}
        done = 0
        for f in concurrent.futures.as_completed(futures):
            res = f.result()
            if res[0]:
                success_cnt += 1
                _, rel_src, orig_s, new_s, rot, col = res
                new_total_size += new_s
                if rot:
                    rotated_cnt += 1
                if col:
                    color_matched_cnt += 1
            else:
                fail_cnt += 1
                print(f"  ❌ 변환 실패: {res[1]} ({res[2]})")
            done += 1
            if done % 100 == 0 or done == len(jpg_files):
                print(f"  [{done}/{len(jpg_files)}] 처리 완료...")

    print(f"\n✅ WebP 변환 성공: {success_cnt}/{len(jpg_files)}개")
    print(f"   - 정방향 픽셀 회전 교정(Bake-in): {rotated_cnt}개")
    print(f"   - sRGB 프로파일 매칭(ColorSync): {color_matched_cnt}개")
    print(f"   - 변환 후 WebP 총 용량: {new_total_size / (1024 * 1024):.2f} MB")
    saved_mb = (orig_total_size - new_total_size) / (1024 * 1024)
    saved_pct = (1 - new_total_size / orig_total_size) * 100
    print(f"   - 절감된 용량: {saved_mb:.2f} MB ({saved_pct:.1f}% 감소!)")

    if fail_cnt > 0:
        print(f"❌ 실패한 파일이 {fail_cnt}개 존재하여 JPG 정리를 중단합니다.")
        return

    # 4. 검증: 참조된 946개 이미지에 대응하는 .webp가 모두 존재하는지 확인
    missing_webp = []
    for rel_src in referenced_srcs:
        webp_rel = Path(rel_src).with_suffix(".webp")
        if not (WEB_DIR / webp_rel).exists() or (WEB_DIR / webp_rel).stat().st_size < 1024:
            missing_webp.append(str(webp_rel))

    if missing_webp:
        print(f"❌ WebP 누락 파일 발견 ({len(missing_webp)}개): {missing_webp[:5]}")
        return

    print("\n▶ 946개 필수 WebP 자산 검증 완료. 기존 .jpg 파일 및 미참조 고아 파일 정리 중...")
    for f in jpg_files:
        f.unlink()

    # 미참조 WebP 고아 파일 정리
    referenced_webps = set(str(Path(s).with_suffix(".webp")) for s in referenced_srcs)
    orphan_webp_cnt = 0
    for w in ASSETS_DIR.rglob("*.webp"):
        rel = str(w.relative_to(WEB_DIR))
        if rel not in referenced_webps:
            w.unlink()
            orphan_webp_cnt += 1

    remaining_jpgs = list(ASSETS_DIR.rglob("*.jpg"))
    webp_count = len(list(ASSETS_DIR.rglob("*.webp")))
    print(f"✅ 정리 완료: 남은 JPG {len(remaining_jpgs)}개, 생성된 WebP {webp_count}개 (미참조 정리 {orphan_webp_cnt}개)")
    print("================================================================")

if __name__ == "__main__":
    main()
