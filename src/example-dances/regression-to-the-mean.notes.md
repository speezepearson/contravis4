# Regression to the Mean

- **Source**: https://contradb.com/dances/3028
- **Author**: Cristy Altamirano, Becket

## Dance Card

- A1: 8 slice left and straight back / 8 circle left 3 places
- A2: 8 neighbors do si do once / 8 neighbors swing
- B1: 8 long lines forward & back / 8 circle left 3 places
- B2: 16 partners meltdown swing

## Key Decisions

- **Progression**: Slice left is the Becket progression. `greet_new_neighbors` with `cid: "person_across"` after the slice.
- **Slice hand state**: slice.ts second segment has `hands: () => ({})`, so no `drop_hands` needed before circle.

## Trouble

1. **Missing `drop_hands` between long_lines and circle** — `long_lines_forward_back` leaves hands connected. Fixed by adding `drop_hands`.
2. **Meltdown swing "unable to resolve end facing across"** — Cascading failure from #1; fixed once hands were dropped.
3. **`trace-dance.ts` improvement** — Made the script stop after the first error.
