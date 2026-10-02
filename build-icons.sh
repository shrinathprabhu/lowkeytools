#!/usr/bin/env bash
# Renders PNG/social assets with macOS Quick Look and ICO directly with Sharp.
# Install development dependencies first: npm install
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

npm run build:favicon
render "$TMP/fullbleed.svg" 180 apple-touch-icon.png
render "$TMP/fullbleed.svg" 192 icon-192.png
render "$TMP/fullbleed.svg" 512 icon-512.png

# social card: rendered square, then centre cropped to 1200x630
qlmanage -t -s 1200 -o "$TMP" og.svg >/dev/null 2>&1
sips -c 630 1200 "$TMP/og.svg.png" --out og.png >/dev/null 2>&1

rm -rf "$TMP"
ls -la og.png favicon.ico apple-touch-icon.png icon-192.png icon-512.png
