#!/usr/bin/env bash
set -e

DURATION="${1:-12}"
OUTDIR="demo"
mkdir -p "$OUTDIR"

# Get active window geometry
eval $(xdotool getactivewindow getwindowgeometry --shell)
W="$WIDTH"
H="$HEIGHT"
X="$X"
Y="$Y"

echo "Recording ${W}x${H} at +${X},+${Y} for ${DURATION}s..."
echo "You have 3 seconds to position your cursor outside the window..."

sleep 3

# Record to MP4 (fast, small)
ffmpeg -y \
  -f x11grab -framerate 15 -video_size "${W}x${H}" -i ":0.0+${X},${Y}" \
  -t "$DURATION" \
  -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p \
  "$OUTDIR/demo-raw.mp4" 2>/dev/null

echo "Converting to GIF (this takes a moment)..."

# Two-pass palette for quality
ffmpeg -y -i "$OUTDIR/demo-raw.mp4" \
  -vf "fps=10,scale=800:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" \
  "$OUTDIR/palette.png" 2>/dev/null

ffmpeg -y -i "$OUTDIR/demo-raw.mp4" -i "$OUTDIR/palette.png" \
  -lavfi "fps=10,scale=800:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" \
  "$OUTDIR/demo.gif" 2>/dev/null

# Clean up
rm "$OUTDIR/demo-raw.mp4" "$OUTDIR/palette.png"

SIZE=$(du -h "$OUTDIR/demo.gif" | cut -f1)
echo ""
echo "Done: $OUTDIR/demo.gif ($SIZE)"
echo ""
echo "If the GIF is too large for GitHub (>10MB), re-run with a shorter duration:"
echo "  ./demo-record.sh 8"
