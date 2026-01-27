#!/usr/bin/env bash
set -ex
rm dist --recursive --force
JSR=1 ./rolldown.config.js
scripts/emit-dts.sh
cp LICENSE dist
JSR=1 scripts/eta.js < src/readme.md | scripts/prepend-readme.js dist/default.d.ts
scripts/emit-jsr-json.js
