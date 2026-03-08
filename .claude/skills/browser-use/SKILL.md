# Browser Use

## Debug Hook

`App.tsx` exposes `window.__debug` with the following methods for browser automation (e.g. via `uvx rodney`):

- `scrub(beat: number)` — jump to a beat, resetting `nProgressions` to 0 and clearing trails
- `setBeat(beat: number)` — jump to a beat without resetting `nProgressions`
- `getNProgressions()` — return the current accumulated progression offset
- `addProgression(n: number)` — add `n` to `nProgressionsRef` and redraw (simulates loop progression)

## Using rodney

`uvx rodney` is a headless Chrome automation CLI. Useful commands:

```
uvx rodney start          # launch headless Chrome
uvx rodney open <url>     # navigate
uvx rodney screenshot <path>  # save PNG
uvx rodney js <expr>      # evaluate JS (no semicolons — use void(function(){...}()) for multi-statement)
uvx rodney click <sel>    # click element
uvx rodney text <sel>     # get text content
uvx rodney html <sel>     # get innerHTML
uvx rodney stop           # shut down Chrome
```

### Gotchas

- **rAF throttling**: headless Chrome throttles `requestAnimationFrame`, so real-time playback runs slower than wall-clock time. Use `window.__debug` to jump directly instead.
- **React range inputs**: setting `.value` and dispatching `change`/`input` events on `<input type="range">` does not trigger React's synthetic onChange. Use `window.__debug.scrub()` instead.
- **JS expressions**: `rodney js` does not support semicolons at the top level. Wrap multi-statement code in `void(function(){...}())`.
- **Keyboard shortcuts**: `document.dispatchEvent(new KeyboardEvent('keydown', {code: 'Space', bubbles: true}))` works for play/pause.
- **Sharing screenshots**: use `curl -F "files[]=@/path/to/file.png" https://uguu.se/upload` to get a temporary public URL (~48h expiry).
