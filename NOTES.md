# Transcription Notes: Regression to the Mean

## Source
- URL: https://contradb.com/dances/3028
- Title: Regression to the Mean
- Author: Cristy Altamirano
- Formation: Becket

## Dance Card (from ContraDB)
- A1: 8 slice left and straight back / 8 circle left 3 places
- A2: 8 neighbors do si do once / 8 neighbors swing
- B1: 8 long lines forward & back / 8 circle left 3 places
- B2: 16 partners meltdown swing

## Key Decisions
- **Progression**: Slice left is the Becket progression. Placed `greet_new_neighbors` with `cid: "person_across"` after the slice, since the two sides move in opposite directions (west goes down, east goes up), putting a new neighbor across from each dancer.
- **Slice hand state**: Checked slice.ts — the second segment has `hands: () => ({})`, so it drops all hands. No `drop_hands` needed between slice and circle.
- **Meltdown swing**: 16 beats with partner, endFacing across. This is the standard "meltdown swing" = shoulder round 1.5x into swing.

## Trouble / Iteration Log

1. **Missing `drop_hands` between long_lines and circle** — `long_lines_forward_back` leaves hands connected (each dancer holds hands with neighbors in the long line). The subsequent `circle left 3` tried to form a ring but failed because hands were already occupied. Fixed by adding a `drop_hands` instruction between them.

2. **Meltdown swing "unable to resolve end facing across"** — This was a cascading failure from issue #1. Once the circle failed, later state was garbage. After fixing the drop_hands issue, the meltdown swing worked fine.

3. **`trace-dance.ts` improvement** — Modified the trace script to stop after the first error, since later instructions produce meaningless results after a failure.

## Final Result
- All 239 tests pass
- All 25 dances (including this new one) pass verify-noop
- 12 instructions, 64 beats total
