# 🙂 게임용 이모지 글꼴 다시 만들기 (이모지를 새로 쓰면 실행)
# 준비: pip install fonttools brotli, 그리고 인터넷 연결
# 실행: python3 scripts/emoji-subset.py
# 하는 일: src 안의 이모지를 모두 찾고 → Google Fonts의 Noto Color Emoji 조각을 받아 →
#          그 이모지만 잘라 src/assets/emoji/에 저장하고 → src/emojiFont.js를 다시 쓴다.
import glob, json, os, re, subprocess, tempfile, urllib.request
from fontTools.ttLib import TTFont

UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0 Mobile Safari/537.36'
OUT = 'src/assets/emoji'


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read()


text = ''.join(open(f, encoding='utf-8').read() for f in glob.glob('src/**/*.js', recursive=True))
css = get('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji').decode()
urls = re.findall(r'url\((https://[^)]+)\)', css)
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
faces = []
with tempfile.TemporaryDirectory() as tmp:
    for i, url in enumerate(urls):
        src = os.path.join(tmp, f's{i}.woff2')
        open(src, 'wb').write(get(url))
        cmap = TTFont(src).getBestCmap()
        used = sorted({ord(c) for c in text if ord(c) >= 0x2000 and ord(c) in cmap and ord(c) not in range(0xAC00, 0xD7A4)})
        if not [c for c in used if c not in (0xFE0F, 0x200D)]:
            continue
        name = f'emoji{i}.woff2'
        subprocess.run(['pyftsubset', src, '--unicodes=' + ','.join('%X' % c for c in used), '--flavor=woff2', '--layout-features=*', '--output-file=' + os.path.join(OUT, name)], check=True)
        faces.append((name, used))

lines = [
    '// 🙂 게임에 들어 있는 이모지 글꼴 (Noto Color Emoji에서 이 게임이 쓰는 이모지만 잘라 낸 것, SIL OFL)',
    '// 폰마다 이모지 글꼴이 달라서 X(빈 네모)로 보이는 일을 막는다. 이모지를 새로 쓰면 scripts/emoji-subset.py로 다시 만든다.',
    '',
]
lines += [f"import url{i} from './assets/emoji/{name}?url';" for i, (name, _) in enumerate(faces)]
lines += ['', 'export const EMOJI_FACES = [']
lines += [f"  {{ url: url{i}, range: '{', '.join('U+%X' % c for c in used)}' }}," for i, (_, used) in enumerate(faces)]
lines += ['];']
open('src/emojiFont.js', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f'이모지 글꼴 {len(faces)}개를 만들었어요')
