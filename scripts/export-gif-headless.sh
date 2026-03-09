#!/usr/bin/env bash
# Export a GIF from Contravis via headless Chrome (rodney).
#
# Usage: ./scripts/export-gif-headless.sh <dance-filename> <output.gif>
# Example: ./scripts/export-gif-headless.sh otters-allemande.ts docs/images/otters-allemande.gif
#
# Prerequisites:
#   - Dev server running on localhost:5173 (npm run dev)
#   - rodney started (uvx rodney start --local)

set -euo pipefail

DANCE="${1:?Usage: export-gif-headless.sh <dance-filename> <output.gif>}"
OUTPUT="${2:?Usage: export-gif-headless.sh <dance-filename> <output.gif>}"

echo "==> Loading dance: $DANCE"

# Open the app
uvx rodney open http://localhost:5173 > /dev/null

# Select the dance
uvx rodney js "(() => { var sel = document.querySelector('.dance-loader select'); sel.value = '$DANCE'; sel.dispatchEvent(new Event('change', { bubbles: true })); return 'loaded'; })()" > /dev/null

# Disable blob URL revocation so we can fetch it after export
uvx rodney js '(() => { URL.revokeObjectURL = function() {}; return "ok"; })()' > /dev/null

# Install download interceptor and click the button
uvx rodney js '(() => {
  window._capturedGifUrl = null;
  var origCreate = document.createElement.bind(document);
  document.createElement = function(tag) {
    var el = origCreate(tag);
    if (tag === "a") {
      var origClick = el.click.bind(el);
      el.click = function() {
        window._capturedGifUrl = el.href;
        origClick();
      };
    }
    return el;
  };
  var btns = document.querySelectorAll("button");
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].textContent.includes("Download GIF")) {
      btns[i].click();
      return "export triggered";
    }
  }
  return "button not found";
})()' > /dev/null

echo "==> Waiting for GIF export to complete..."

# Poll until the button text returns to "Download GIF" (not "Exporting...")
for i in $(seq 1 60); do
  sleep 1
  STATE=$(uvx rodney js '(() => { var btns = document.querySelectorAll("button"); for (var i = 0; i < btns.length; i++) { if (btns[i].textContent === "Download GIF") return "done"; if (btns[i].textContent === "Exporting...") return "exporting"; } return "unknown"; })()' 2>&1)
  if [ "$STATE" = "done" ]; then break; fi
done

# Verify we captured the URL
URL_CHECK=$(uvx rodney js 'window._capturedGifUrl ? "ok" : "missing"' 2>&1)
if [ "$URL_CHECK" != "ok" ]; then
  echo "ERROR: Failed to capture GIF URL" >&2
  exit 1
fi

echo "==> Fetching GIF blob and encoding to base64..."

# Fetch blob and convert to base64 in the browser
uvx rodney js '(() => {
  window._gifB64 = null;
  window._gifError = null;
  fetch(window._capturedGifUrl).then(function(r) { return r.arrayBuffer(); }).then(function(ab) {
    var bytes = new Uint8Array(ab);
    var binary = "";
    var chunkSize = 32768;
    for (var i = 0; i < bytes.length; i += chunkSize) {
      var chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (var j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    window._gifB64 = btoa(binary);
  })["catch"](function(e) { window._gifError = e.message; });
  return "encoding";
})()' > /dev/null

# Wait for encoding to finish
for i in $(seq 1 120); do
  sleep 1
  CHECK=$(uvx rodney js 'window._gifB64 ? "ready " + window._gifB64.length : (window._gifError ? "error: " + window._gifError : "waiting")' 2>&1)
  case "$CHECK" in
    ready*) break ;;
    error*) echo "ERROR: $CHECK" >&2; exit 1 ;;
  esac
done

TOTAL=$(uvx rodney js 'window._gifB64.length' 2>&1)
echo "==> Extracting $TOTAL base64 characters..."

# Extract base64 in chunks
CHUNK=100000
> /tmp/gif_b64.txt
I=0
while [ $I -lt "$TOTAL" ]; do
  uvx rodney js "window._gifB64.substring($I, $((I + CHUNK)))" >> /tmp/gif_b64.txt
  I=$((I + CHUNK))
done

# Decode and save
mkdir -p "$(dirname "$OUTPUT")"
base64 -d /tmp/gif_b64.txt > "$OUTPUT"
rm /tmp/gif_b64.txt

SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
echo "==> Saved $OUTPUT ($SIZE)"
