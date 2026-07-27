import json
import urllib.request
from collections import Counter

url = 'https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/config.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
data = json.loads(urllib.request.urlopen(req, timeout=30).read())

print('top keys:', list(data.keys()))

assets = data.get('assets', {})
print('assets count:', len(assets))

# Asset entries have keys like id; values are dicts with 'type', 'data', 'name', etc.
types = Counter()
scripts = []
textures = []
models = []
audio = []
for aid, asset in assets.items():
    if not isinstance(asset, dict):
        continue
    t = asset.get('type', 'unknown')
    types[t] += 1
    name = asset.get('name') or asset.get('data', {}).get('name') or asset.get('file', {}).get('filename') or ''
    entry = {'id': aid, 'name': name, 'type': t}
    if t == 'script':
        scripts.append(entry)
    elif t == 'texture':
        textures.append(entry)
    elif t == 'model':
        models.append(entry)
    elif t == 'audio':
        audio.append(entry)

print('type counts:', dict(types))
print('script names:', [s['name'] for s in scripts[:40]])
print('texture count:', len(textures))
print('model count:', len(models))
print('audio count:', len(audio))

# Save a compact extracted summary for downstream use.
out = {
    'scenes': data.get('scenes', []),
    'scripts': scripts,
    'texture_count': len(textures),
    'model_count': len(models),
    'audio_count': len(audio),
    'type_counts': dict(types),
}
with open('research/omnom_config_assets.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2)
print('saved research/omnom_config_assets.json')
