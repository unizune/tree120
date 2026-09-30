import urllib.request, ssl, re, json, concurrent.futures
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CTX = ssl.create_default_context()

synonyms = {
    '반송': '소나무',
    '독일가문비': '가문비나무',
    '눈향나무': '향나무',
    '노랑말채나무': '흰말채나무',
    '금식나무': '식나무',
    '금목서': '목서',
    '복자기': '복자기나무',
    '인동덩굴': '인동',
    '팔손이': '팔손이나무',
    '피라칸타': '피라칸다',
    '해송': '곰솔',
    '앵두나무': '앵도나무',
    '매실나무': '매실나무',
    '백합나무': '튤립나무'
}

def clean_html(text):
    if not text: return ''
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def summarize_morph(part_name, data):
    if not isinstance(data, dict):
        return clean_html(str(data))
    if part_name == '잎':
        items = []
        if '차례' in data and data['차례'] != '-': items.append(data['차례'].split('/')[0].strip())
        if '생김새' in data and data['생김새'] != '-':
            # pick first sentence or up to slash
            s = data['생김새'].split('/')[0].strip()
            items.append(s)
        if '변두리' in data and data['변두리'] != '-': items.append('가장자리: ' + data['변두리'].split('/')[0].strip())
        elif '가장자리' in data and data['가장자리'] != '-': items.append('가장자리: ' + data['가장자리'].split('/')[0].strip())
        if '잎맥' in data and data['잎맥'] != '-': items.append(data['잎맥'].split('/')[0].strip())
        return ' · '.join(items) if items else '자료 참조'
    elif part_name == '꽃':
        items = []
        if '색' in data and data['색'] != '-': items.append(data['색'].split('/')[0].strip() + ' 꽃')
        if '꽃차례' in data and data['꽃차례'] != '-': items.append(data['꽃차례'].split('/')[0].strip())
        if '생김새' in data and data['생김새'] != '-': items.append(data['생김새'].split('/')[0].strip())
        return ' · '.join(items) if items else '자료 참조'
    elif part_name == '열매':
        items = []
        if '색' in data and data['색'] != '-': items.append(data['색'].split('/')[0].strip() + ' 열매')
        if '생김새' in data and data['생김새'] != '-': items.append(data['생김새'].split('/')[0].strip())
        return ' · '.join(items) if items else '자료 참조'
    elif part_name == '줄기':
        items = []
        if '생김새' in data and data['생김새'] != '-': items.append(data['생김새'].split('/')[0].strip())
        if '색' in data and data['색'] != '-': items.append('수피: ' + data['색'].split('/')[0].strip())
        return ' · '.join(items) if items else '자료 참조'
    return ''

def get_srl(name, aliases, catalog):
    if name in catalog: return catalog[name]
    for a in aliases:
        if a in catalog: return catalog[a]
    if name in synonyms and synonyms[name] in catalog: return catalog[synonyms[name]]
    for k in catalog:
        if k == name + '나무' or k + '나무' == name: return catalog[k]
    return None

def fetch_catalog():
    cat_path = ROOT / 'research/treeworld_catalog.json'
    if cat_path.exists():
        return json.loads(cat_path.read_text(encoding='utf-8'))
    
    print('Fetching treeworld catalog...')
    catalog = {}
    def get_page(p):
        url = f'https://treeworld.co.kr/index.php?mid=a01_01_02&page={p}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, timeout=10, context=CTX) as r:
                html = r.read().decode('utf-8', errors='ignore')
                matches = re.findall(r'document_srl=(\d+)[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</a>', html)
                return [(srl, t.strip()) for srl, t in matches if t.strip() != 'Read More']
        except Exception:
            return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        results = ex.map(get_page, range(1, 123))
        for res in results:
            for srl, name in res:
                catalog[name] = srl
    cat_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    return catalog

def fetch_tree_detail(tree_info, catalog):
    tid = tree_info['id']
    name = tree_info['name']
    aliases = tree_info.get('aliases', [])
    srl = get_srl(name, aliases, catalog)
    if not srl:
        print(f'Warning: No treeworld srl for {name}')
        return tid, None

    url = f'https://treeworld.co.kr/a01_01_02/{srl}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10, context=CTX) as r:
            html = r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f'Error fetching {name} ({url}): {e}')
        return tid, None

    # 1. Basic plant info
    info = {
        'treeworldUrl': url,
        'treeworldSrl': srl,
        'matchedName': name
    }
    for k, field in [('학명', 'scientificName'), ('과명', 'family'), ('영명', 'englishName'), ('향명', 'folkNames')]:
        m = re.search(r'<th scope=\"row\">' + k + r'</th>\s*<td[^>]*>(.*?)</td>', html, re.DOTALL)
        if m:
            val = clean_html(m.group(1))
            info[field] = val

    # 2. Detailed morphology
    idx = html.find('et_vars_cyber2')
    morph = {}
    if idx != -1:
        chunk = html[idx:idx+12000]
        parts = re.findall(r'<th scope=\"row\">([^<]+)</th>\s*<td>\s*(?:<table[^>]*>(.*?)</table>|([^<]+))', chunk, re.DOTALL)
        for p in parts:
            pname = p[0].strip()
            if p[1]:
                sub = re.findall(r'<th scope=\"row\">([^<]+)</th>\s*<td>(.*?)</td>', p[1], re.DOTALL)
                morph[pname] = {k.strip(): clean_html(v) for k, v in sub}
            elif p[2]:
                morph[pname] = clean_html(p[2])

    leaf_summary = summarize_morph('잎', morph.get('잎', {}))
    flower_summary = summarize_morph('꽃', morph.get('꽃', {}))
    fruit_summary = summarize_morph('열매', morph.get('열매', {}))
    stem_summary = summarize_morph('줄기', morph.get('줄기', {}))

    # Fallback to general descriptions if empty
    if not leaf_summary: leaf_summary = '어긋나거나 마주나며 수종 고유의 형태를 이룸'
    if not flower_summary: flower_summary = '개화기 수분 방식에 맞는 꽃차례 형성'
    if not fruit_summary: fruit_summary = '성숙기 고유 형태 및 색상 결실'
    if not stem_summary: stem_summary = '수형 및 수피 특성'

    # The 4 main characteristics
    features4 = [
        {'part': '잎', 'icon': '🌿', 'desc': leaf_summary},
        {'part': '꽃', 'icon': '🌸', 'desc': flower_summary},
        {'part': '열매', 'icon': '🍒', 'desc': fruit_summary},
        {'part': '줄기·수형', 'icon': '🪵', 'desc': stem_summary}
    ]

    info['morphology'] = {
        'leaf': morph.get('잎', {}),
        'flower': morph.get('꽃', {}),
        'fruit': morph.get('열매', {}),
        'stem': morph.get('줄기', {}),
        'raw': morph,
        'features4': features4
    }

    # Generate photo morphology captions for existing images
    images_desc = []
    points = tree_info.get('points', [])
    for idx_img in range(len(tree_info.get('images', []))):
        if idx_img == 0:
            tag = '잎·전경'
            desc = f"잎 및 전체 형태: {points[0] if len(points) > 0 else leaf_summary}"
        elif idx_img == 1:
            tag = '꽃·열매'
            desc = f"꽃/열매 형태: {points[1] if len(points) > 1 else flower_summary}"
        else:
            tag = '감별 세부'
            desc = f"수피·세부 특징: {points[2] if len(points) > 2 else stem_summary}"
        images_desc.append({'tag': tag, 'desc': desc})

    info['photoDescriptions'] = images_desc
    return tid, info

def main():
    catalog = fetch_catalog()
    trees = json.loads((ROOT / 'web/trees.json').read_text(encoding='utf-8'))
    print(f'Fetching details for {len(trees)} trees...')

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(fetch_tree_detail, t, catalog): t for t in trees}
        for fut in concurrent.futures.as_completed(futures):
            tid, info = fut.result()
            if info:
                results[tid] = info

    print(f'Successfully fetched and parsed {len(results)}/{len(trees)} trees.')
    out_file = ROOT / 'research/treeworld_data.json'
    out_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Saved to {out_file}')

if __name__ == '__main__':
    main()
