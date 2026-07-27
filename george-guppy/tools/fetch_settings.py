import urllib.request
from pathlib import Path

url = 'https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/__settings__.js'
r = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
text = urllib.request.urlopen(r, timeout=30).read().decode('utf-8')

out = Path('research/omnom_settings.js.txt')
out.write_text(text, encoding='utf-8')
print('saved', out, 'bytes', len(text))

# Extract key PlayCanvas settings lines.
for line in text.splitlines():
    stripped = line.strip()
    if any(k in stripped for k in ['SCENE_PATH', 'CONTEXT_OPTIONS', 'PRELOAD_MODULES', 'ASSET_PREFIX']):
        print(stripped[:160])
