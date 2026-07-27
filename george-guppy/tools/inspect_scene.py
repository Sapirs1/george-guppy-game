import json
import urllib.request
from pathlib import Path
from collections import Counter

url = 'https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/1121883.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
data = json.loads(urllib.request.urlopen(req, timeout=30).read())

print('top keys:', list(data.keys()))
ents = data.get('entities', {})
print('entities type:', type(ents))
if isinstance(ents, dict):
    print('entities count:', len(ents))
    sample = list(ents.values())[:3]
    for i, e in enumerate(sample):
        if isinstance(e, dict):
            print(f'sample {i} keys:', list(e.keys()))
            print(f'sample {i} name:', e.get('name'))

# Count name distribution ignoring empty names.
names = [e.get('name') for e in ents.values() if isinstance(e, dict) and e.get('name')]
print('non-empty names count:', len(names))
print('top names:', Counter(names).most_common(40))
