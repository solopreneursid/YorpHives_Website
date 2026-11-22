#!/usr/bin/env python3
"""Rebuild the local PDF font pack from installed SIL OFL Noto TTF files.

Requires fontTools only when refreshing assets, not when building the website.
The generated pack is committed and its SHA-256 is checked by the test suite.
"""
import hashlib
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]) if len(sys.argv) == 2 else Path('/usr/share/fonts/truetype/noto')
names = [
    'NotoSans-Regular', 'NotoSansArabic-Regular', 'NotoSansBengali-Regular',
    'NotoSansDevanagari-Regular', 'NotoSansGujarati-Regular', 'NotoSansGurmukhi-Regular',
    'NotoSansHebrew-Regular', 'NotoSansKannada-Regular', 'NotoSansMalayalam-Regular',
    'NotoSansMyanmar-Regular', 'NotoSansOriya-Regular', 'NotoSansSinhala-Regular',
    'NotoSansTamil-Regular', 'NotoSansTelugu-Regular', 'NotoSansThai-Regular',
]
data = bytearray()
rows = []
for index, name in enumerate(names):
    path = source / (name + '.ttf')
    font_bytes = path.read_bytes()
    offset = len(data)
    data.extend(font_bytes)
    ranges = []
    for point in sorted(TTFont(path).getBestCmap()):
        if ranges and point == ranges[-1][1] + 1:
            ranges[-1][1] = point
        else:
            ranges.append([point, point])
    rows.append({'family': 'YorpNoto' + str(index), 'offset': offset,
                 'length': len(font_bytes), 'ranges': ranges, 'name': name})

(root / 'tools/pdf-fonts/yorphives-noto-pack.bin').write_bytes(data)
(root / 'tools/pdf-font-coverage.mjs').write_text(
    '// Generated from cmap tables of the bundled SIL OFL Noto fonts.\n'
    + 'export const PDF_FONT_PACK_SIZE=' + str(len(data)) + ';\n'
    + 'export const PDF_FONT_PACK_SHA256=' + json.dumps(hashlib.sha256(data).hexdigest()) + ';\n'
    + 'export const PDF_FONTS=' + json.dumps(rows, separators=(',', ':')) + ';\n',
    encoding='utf-8',
)
print('Font pack SHA-256:', hashlib.sha256(data).hexdigest())
print('After an intentional font update, review licenses and update the pinned test hash.')
