# A-1 Reel

**Source**: https://contradb.com/dances/2267
**Author**: Chris Weiler
**Formation**: Becket CCW

## Key Decisions

- **Formation**: Becket CCW — the dance starts with dancers rotated 180° from standard Becket.
- **Progression**: California twirl at beat 12-16, followed by `greet_new_neighbors` with `cid: "person_in_front"`. This is the same pattern as Don't Look Back.
- **"ladles allemande right 1½"**: Mapped to a `split` with robins doing `allemande` (right, 1.5 rotations, cid `"opposite"`) and larks doing nothing.

## Hand State Notes

- Circle leaves ring hands → `take_hands_in_rings` is a no-op after circle (already in ring)
- After `balance_the_ring`, need `drop_hands` before `california_twirl`
- After `california_twirl`, need `drop_hands` before `balance_and_swing` (twirl leaves partner hands connected)
- After `right_left_through`, need `drop_hands` before the `split` with robins' allemande
- After the robins' allemande, need `drop_hands` before `balance_and_swing` for partners

## Transcription

Straightforward dance. The only complication was remembering to `drop_hands` after the california twirl — the twirl leaves partners holding hands, which conflicts with the neighbor balance & swing that follows.
