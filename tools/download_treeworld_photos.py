import urllib.request, ssl, json, re, shutil, subprocess, concurrent.futures
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CTX = ssl.create_default_context()
HEADERS = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://treeworld.co.kr/'}

PRIORITY = ['잎', '꽃', '열매', '수형', '줄기', '겨울눈', '새순', '가지', '기타1', '기타2']

def get_morph_desc_for_tag(tag, morph_data, points, tid_name):
    raw = morph_data.get('raw', {})
    leaf = morph_data.get('leaf', {})
    flower = morph_data.get('flower', {})
    fruit = morph_data.get('fruit', {})
    stem = morph_data.get('stem', {})

    if tag == '잎':
        items = []
        if '차례' in leaf and leaf['차례'] != '-': items.append(leaf['차례'].split('/')[0].strip())
        if '생김새' in leaf and leaf['생김새'] != '-': items.append(leaf['생김새'].split('/')[0].strip())
        if '가장자리' in leaf and leaf['가장자리'] != '-': items.append('가장자리: ' + leaf['가장자리'].split('/')[0].strip())
        elif '변두리' in leaf and leaf['변두리'] != '-': items.append('가장자리: ' + leaf['변두리'].split('/')[0].strip())
        if '잎맥' in leaf and leaf['잎맥'] != '-': items.append(leaf['잎맥'].split('/')[0].strip())
        if items: return f"잎: {' · '.join(items[:3])}"
        return f"잎: {points[0] if len(points) > 0 else '잎의 독특한 형태와 잎맥'}"

    elif tag == '꽃':
        items = []
        if '색' in flower and flower['색'] != '-': items.append(flower['색'].split('/')[0].strip() + ' 꽃')
        if '꽃차례' in flower and flower['꽃차례'] != '-': items.append(flower['꽃차례'].split('/')[0].strip())
        if '생김새' in flower and flower['생김새'] != '-': items.append(flower['생김새'].split('/')[0].strip())
        if items: return f"꽃: {' · '.join(items[:3])}"
        return f"꽃: {points[1] if len(points) > 1 else '개화기 꽃의 형태'}"

    elif tag == '열매':
        items = []
        if '색' in fruit and fruit['색'] != '-': items.append(fruit['색'].split('/')[0].strip() + ' 열매')
        if '생김새' in fruit and fruit['생김새'] != '-': items.append(fruit['생김새'].split('/')[0].strip())
        if items: return f"열매: {' · '.join(items[:2])}"
        return f"열매: {points[1] if len(points) > 1 else '성숙기 결실 형태'}"

    elif tag in ['수형', '줄기']:
        items = []
        if '생김새' in stem and stem['생김새'] != '-': items.append(stem['생김새'].split('/')[0].strip())
        if '색' in stem and stem['색'] != '-': items.append('수피: ' + stem['색'].split('/')[0].strip())
        if items: return f"{tag}: {' · '.join(items[:2])}"
        return f"{tag}: {points[2] if len(points) > 2 else '자람새 및 줄기 특징'}"

    elif tag == '겨울눈':
        winter = raw.get('겨울눈', {})
        if isinstance(winter, dict) and '섞인눈' in winter and winter['섞인눈'] != '-':
            return f"겨울눈: {winter['섞인눈'].split('/')[0].strip()}"
        return f"겨울눈: 월동기 눈의 배열과 비늘잎 형태"

    elif tag == '가지':
        branch = raw.get('가지', {})
        if isinstance(branch, dict) and '생김새' in branch and branch['생김새'] != '-':
            return f"가지: {branch['생김새'].split('/')[0].strip()}"
        return f"가지: 햇가지 및 잔가지의 분지 특성"

    elif tag == '새순':
        return f"새순: 봄철 새로 돋아나는 잎과 가지"

    return f"{tag}: {tid_name}의 고유 형태"

def download_and_optimize(url, out_path):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
        data = r.read()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)
    # Resize with sips if available
    try:
        subprocess.run(['/usr/bin/sips', '-Z', '960', str(out_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def process_tree(tid, raw_info, tw_info, points):
    name = raw_info['name']
    raw_photos = raw_info.get('photos', [])
    images_manifest = []

    # Tree 95 진달래 fallback
    if tid == 95 or not raw_photos:
        backup_dir = ROOT / 'research/assets_video_backup'
        for idx, (b_name, tag, desc) in enumerate([
            ('095-1.jpg', '꽃·전경', '꽃: 연분홍빛 또는 자주색 꽃이 잎보다 먼저 가지에 무리 지어 핌'),
            ('095-2.jpg', '잎·수형', '잎 및 줄기: 긴타원형 또는 거꿀피침형, 높이 2~3m 자람')
        ]):
            src_file = backup_dir / b_name
            target_rel = f'assets/{tid:03}-{idx+1}.jpg'
            target_file = ROOT / 'web' / target_rel
            if src_file.exists():
                shutil.copy(src_file, target_file)
                images_manifest.append({
                    'src': target_rel,
                    'tag': tag,
                    'desc': desc
                })
        return tid, images_manifest

    # Sort photos by priority
    def sort_key(p):
        t = p['type']
        return PRIORITY.index(t) if t in PRIORITY else 99

    sorted_photos = sorted(raw_photos, key=sort_key)
    picked = []
    seen_types = set()
    for p in sorted_photos:
        if p['type'] not in seen_types:
            seen_types.add(p['type'])
            picked.append(p)
        if len(picked) >= 4:
            break

    if len(picked) < 3:
        for p in sorted_photos:
            if p not in picked:
                picked.append(p)
            if len(picked) >= 3:
                break

    # Download each picked photo
    for idx, p in enumerate(picked):
        tag = p['type']
        desc = get_morph_desc_for_tag(tag, tw_info.get('morphology', {}), points, name)
        target_rel = f'assets/{tid:03}-{idx+1}.jpg'
        target_file = ROOT / 'web' / target_rel
        try:
            download_and_optimize(p['src'], target_file)
            images_manifest.append({
                'src': target_rel,
                'tag': tag,
                'desc': desc
            })
        except Exception as e:
            print(f"Error downloading {tid} {name} {tag} ({p['src']}): {e}")

    return tid, images_manifest

def main():
    raw_data = json.load((ROOT / 'research/treeworld_photos_raw.json').open(encoding='utf-8'))
    tw_data = json.load((ROOT / 'research/treeworld_data.json').open(encoding='utf-8'))
    
    notes = {}
    for line in (ROOT / 'research/notes.tsv').read_text(encoding='utf-8').splitlines():
        parts = line.split('\t')
        notes[int(parts[0])] = parts[1].split('|')

    print('Downloading and optimizing treeworld photos for 120 trees...')
    manifest = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futures = {
            ex.submit(process_tree, tid, raw_data.get(str(tid), {}), tw_data.get(str(tid), {}), notes.get(tid, [])): tid
            for tid in range(1, 121)
        }
        for fut in concurrent.futures.as_completed(futures):
            tid, imgs = fut.result()
            manifest[tid] = imgs

    out_file = ROOT / 'research/treeworld_images_manifest.json'
    out_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"All done! Saved {len(manifest)} trees manifest to {out_file}")

if __name__ == '__main__':
    main()
