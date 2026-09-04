#!/usr/bin/env bash
# Renders the PNG/ICO icons from favicon.svg using macOS Quick Look.
# Run this only when the mark changes: ./build-icons.sh
set -euo pipefail
cd "$(dirname "$0")"

TMP=".iconbuild"
rm -rf "$TMP"; mkdir -p "$TMP"

render() { # render <src.svg> <size> <out.png>
  local src="$1" size="$2" out="$3"
  sed "s|width=\"64\" height=\"64\"|width=\"$size\" height=\"$size\"|" "$src" > "$TMP/in.svg"
  qlmanage -t -s "$size" -o "$TMP" "$TMP/in.svg" >/dev/null 2>&1
  mv "$TMP/in.svg.png" "$out"
}

# full bleed variant for home screen / PWA icons (the OS adds its own rounding)
sed 's|rx="14"|rx="0"|' favicon.svg > "$TMP/fullbleed.svg"

render favicon.svg 48  "$TMP/f48.png"
render favicon.svg 32  "$TMP/f32.png"
render favicon.svg 16  "$TMP/f16.png"
render "$TMP/fullbleed.svg" 180 apple-touch-icon.png
render "$TMP/fullbleed.svg" 192 icon-192.png
render "$TMP/fullbleed.svg" 512 icon-512.png

python3 - "$TMP/f16.png" "$TMP/f32.png" "$TMP/f48.png" <<'PY'
import struct, sys
pngs = [(open(p, 'rb').read(), s) for p, s in zip(sys.argv[1:], (16, 32, 48))]
head = struct.pack('<HHH', 0, 1, len(pngs))
offset = 6 + 16 * len(pngs)
entries, blobs = b'', b''
for data, size in pngs:
    entries += struct.pack('<BBBBHHII', size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
    blobs += data
    offset += len(data)
open('favicon.ico', 'wb').write(head + entries + blobs)
print('favicon.ico', len(head + entries + blobs), 'bytes')
PY

# social card: rendered square, then centre cropped to 1200x630
qlmanage -t -s 1200 -o "$TMP" og.svg >/dev/null 2>&1
sips -c 630 1200 "$TMP/og.svg.png" --out og.png >/dev/null 2>&1

rm -rf "$TMP"
ls -la og.png favicon.ico apple-touch-icon.png icon-192.png icon-512.png
