#!/bin/sh
# Firebase SDK'ni bitta faylga yig'ish (assets/vendor/firebase/firebase.bundle.js). Faqat versiyani yangilashda kerak.
set -e
TMP=$(mktemp -d); cp "$(dirname "$0")/firebase-entry.js" "$TMP/entry.js"; cd "$TMP"
npm init -y >/dev/null && npm i firebase@10.14.1 esbuild@0.24.0 >/dev/null
npx esbuild entry.js --bundle --minify --format=iife --global-name=FB --target=es2019 --legal-comments=eof --outfile=firebase.bundle.js
cp firebase.bundle.js "$OLDPWD/assets/vendor/firebase/firebase.bundle.js"
