#!/usr/bin/env bash
set -e

echo "=== Linting ==="
web-ext lint

echo ""
echo "=== Building ==="
web-ext build --overwrite-dest

echo ""
echo "=== Done ==="
echo "Package: web-ext-artifacts/wa_privacy_blur-1.0.zip"
