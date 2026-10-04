import json, csv
from pathlib import Path

r = Path(__file__).resolve().parent.parent

# 1. Load notes
notes = {}
for line in (r / 'research/notes.tsv').read_text(encoding='utf-8').splitlines():
    parts = line.split('\t')
    notes[int(parts[0])] = {
        'points': parts[1].split('|'),
        'caution': parts[2] if len(parts) > 2 else ''
    }

# 2. Load catalog & images
raw_trees = json.loads((r / 'research/images.json').read_text(encoding='utf-8'))
tw_images = json.loads((r / 'research/treeworld_images_manifest.json').read_text(encoding='utf-8'))
nature_images = json.loads((r / 'research/nature_curated_manifest.json').read_text(encoding='utf-8'))

# 3. Load treeworld rich data & wikipedia data & nature data
tw_data = json.loads((r / 'research/treeworld_data.json').read_text(encoding='utf-8'))
wiki_data = {item['id']: item for item in json.loads((r / 'research/wikipedia_data.json').read_text(encoding='utf-8'))}
nature_data = json.loads((r / 'research/nature_data.json').read_text(encoding='utf-8'))

aliases = {
    11: ['해송'],
    38: ['매실나무'],
    56: ['복숭아나무'],
    78: ['앵두나무'],
    104: ['튤립나무'],
    110: ['피라칸타']
}

trees = []
for t in raw_trees:
    tid = t['id']
    item = {
        'id': tid,
        'name': t['name'],
        'start': t['start'],
        'source': 'https://www.youtube.com/watch?v=K3PvgTi3eXI',
        'sourceTitle': '2026 조경기능사 및 나무의사 수목감별 120 올인원총정리',
        'creator': '파이팅혼공TV',
        'aliases': aliases.get(tid, [])
    }
    item.update(notes[tid])

    # Tag normalization to match 4 main morphology indicators (잎, 꽃, 열매, 줄기·수형, 기타)
    tag_map = {
        '수형': '줄기·수형',
        '줄기': '줄기·수형',
        '가지': '줄기·수형',
        '꽃·전경': '꽃',
        '잎·수형': '잎',
        '기타1': '기타'
    }

    # Combine photos: Treeworld photos + Nature (국가생물종지식정보시스템) photos
    combined_images = []
    for im in tw_images.get(str(tid), []):
        norm_tag = tag_map.get(im['tag'], im['tag'])
        combined_images.append({
            'src': im['src'],
            'tag': norm_tag,
            'desc': im.get('desc', f"{t['name']} {norm_tag} 형태"),
            'source': '사이버수목원'
        })

    for im in nature_images.get(str(tid), {}).get('images', []):
        norm_tag = tag_map.get(im['tag'], im['tag'])
        combined_images.append({
            'src': im['src'],
            'tag': norm_tag,
            'desc': im.get('desc', f"{t['name']} {norm_tag} 형태"),
            'author': im.get('author', '국립수목원'),
            'date': im.get('date', ''),
            'location': im.get('location', ''),
            'source': '국가생물종지식정보시스템'
        })

    item['images'] = combined_images

    # Treeworld enrichments
    tw = tw_data.get(str(tid), {})
    item['treeworldUrl'] = tw.get('treeworldUrl', '')
    item['scientificName'] = tw.get('scientificName', '')
    item['family'] = tw.get('family', '')
    item['englishName'] = tw.get('englishName', '')
    item['folkNames'] = tw.get('folkNames', '')

    morph = tw.get('morphology', {})
    item['features4'] = morph.get('features4', [])
    item['morphology'] = {
        'leaf': morph.get('leaf', {}),
        'flower': morph.get('flower', {}),
        'fruit': morph.get('fruit', {}),
        'stem': morph.get('stem', {})
    }

    # Wikipedia links
    wk = wiki_data.get(tid, {})
    item['wikiKoUrl'] = wk.get('wikiKoUrl', '')
    item['wikiEnUrl'] = wk.get('wikiEnUrl', '')

    # Nature links (국가생물종지식정보시스템)
    nat = nature_data.get(str(tid), {})
    item['natureUrl'] = nat.get('natureUrl', '')

    trees.append(item)

assert len(trees) == 120 and [t['id'] for t in trees] == list(range(1, 121))
assert all(len(t['images']) >= 4 and len(t['points']) == 3 for t in trees)
assert all(len(t['features4']) == 4 for t in trees)
assert all(t['treeworldUrl'] for t in trees)
assert all(t.get('natureUrl') for t in trees)
assert all(t.get('wikiKoUrl') and t.get('wikiEnUrl') for t in trees)

for t in trees:
    for im in t['images']:
        img_path = r / 'web' / im['src']
        assert img_path.exists(), f"Image missing: {img_path}"

# Write web/trees.json & web/data.js
(r / 'web/trees.json').write_text(json.dumps(trees, ensure_ascii=False, indent=2), encoding='utf-8')
(r / 'web/data.js').write_text('window.TREES = ' + json.dumps(trees, ensure_ascii=False) + ';\n', encoding='utf-8')

# Write CSV with enhanced columns
csv_headers = [
    '영상번호', '수목명', '학명', '과명', '영명', '감별포인트1', '감별포인트2', '감별포인트3',
    '주된특징_잎', '주된특징_꽃', '주된특징_열매', '주된특징_줄기수형', '비교·주의',
    '파이팅혼공TV강의구간', '수목도감URL', '국가생물종지식정보시스템URL', '위키백과_한국어URL', 'Wikipedia_EnglishURL', '수목도감사진목록'
]

with (r / '수목120-학습자료.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(csv_headers)
    for t in trees:
        f4 = {item['part']: item['desc'] for item in t['features4']}
        w.writerow([
            t['id'],
            t['name'],
            t['scientificName'],
            t['family'],
            t['englishName'],
            t['points'][0],
            t['points'][1],
            t['points'][2],
            f4.get('잎', ''),
            f4.get('꽃', ''),
            f4.get('열매', ''),
            f4.get('줄기·수형', ''),
            t['caution'],
            f"{t['source']}&t={t['start']}s",
            t['treeworldUrl'],
            t.get('natureUrl', ''),
            t.get('wikiKoUrl', ''),
            t.get('wikiEnUrl', ''),
            ';'.join(f"web/{im['src']}({im['tag']})" for im in t['images'])
        ])

# Write Markdown Study Note
md = [
    '# 수목감별 120 학습 노트',
    '',
    '출처: [파이팅혼공TV 원영상](https://www.youtube.com/watch?v=K3PvgTi3eXI), [국가생물종지식정보시스템](https://www.nature.go.kr/), [사이버 수목원 수목도감](https://treeworld.co.kr/a01_01_02), [위키백과](https://ko.wikipedia.org/) 및 [Wikipedia](https://en.wikipedia.org/).',
    '조경기능사 및 나무의사 수목감별 120종 시험 대비를 위해 영상 핵심 포인트와 수목도감의 학명·과명, 4대 형태학적 특징(잎, 꽃, 열매, 줄기/수형), 수목도감 부위별 실물 사진, 국가생물종지식정보시스템 공식 도감, 그리고 다각도 식물학적 동정을 위한 한국어/영문 위키백과 문서를 종합 정리한 개인 학습용 자료입니다.',
    '',
    '영상 구간 링크는 해당 수목을 확인한 대표 화면 시점이며, 수목도감, 국가생물종지식정보시스템 및 위키백과 링크를 통해 상세한 식물학적 형태와 생태를 추가로 확인하실 수 있습니다.',
    ''
]

for t in trees:
    md.append(f"## {t['id']:03}. {t['name']}")
    sub_title = []
    if t['scientificName']: sub_title.append(f"*{t['scientificName']}*")
    if t['family']: sub_title.append(t['family'])
    if sub_title:
        md.append(f"> {' · '.join(sub_title)}")
        md.append('')

    # Photos with morphology tag and description
    for idx, im in enumerate(t['images']):
        md.append(f"![{t['name']} - {im['tag']}](web/{im['src']})")
        src_label = f"[{im.get('source', '')}] " if im.get('source') else ""
        meta_parts = [f"{im['tag']} | {im['desc']}"]
        if im.get('author'): meta_parts.append(im['author'])
        if im.get('date'): meta_parts.append(im['date'])
        md.append(f"*{src_label}{' · '.join(meta_parts)}*")
        md.append('')

    md.append('### 감별 핵심 포인트')
    md.extend('- ' + p for p in t['points'])
    md.append('')

    md.append('### 주된 형태 특징 (4대 감별 지표)')
    for f in t['features4']:
        md.append(f"- **{f['icon']} {f['part']}:** {f['desc']}")
    md.append('')

    if t['caution']:
        md.append(f"**비교·주의:** {t['caution']}")
        md.append('')

    links = []
    links.append(f"[파이팅혼공 TV 강의]({t['source']}&t={t['start']}s)")
    if t.get('natureUrl'):
        links.append(f"[국가생물종지식정보시스템]({t['natureUrl']})")
    if t['treeworldUrl']:
        links.append(f"[수목도감(treeworld)]({t['treeworldUrl']})")
    if t.get('wikiKoUrl'):
        links.append(f"[위키백과(한국어)]({t['wikiKoUrl']})")
    if t.get('wikiEnUrl'):
        links.append(f"[Wikipedia(English)]({t['wikiEnUrl']})")
    md.append(' · '.join(links))
    md.append('')

(r / '수목120-학습노트.md').write_text('\n'.join(md), encoding='utf-8')

tw_cnt = sum(1 for t in trees for im in t['images'] if im.get('source') == '사이버수목원')
nat_cnt = sum(1 for t in trees for im in t['images'] if im.get('source') == '국가생물종지식정보시스템')
print(f"Verified {len(trees)} trees, {sum(len(t['images']) for t in trees)} total photos ({tw_cnt} treeworld + {nat_cnt} nature), {sum(len(t['points']) for t in trees)} points, 120 nature links, 120 treeworld links, 120 KO wiki links, 120 EN wiki links.")
