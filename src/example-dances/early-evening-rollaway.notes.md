# Early Evening Rollaway — Transcription Notes

**Source**: https://contradb.com/dances/2593
**Author**: Bob Isaacs
**Formation**: improper

## Structure

A1: neighbors balance & swing (16)
A2: right left through (8) → ladles chain (8)
B1: balance the ring (4) → larks roll away neighbors (4) → partners swing (8)
B2: circle left 3 (6) → pass through (2) → do-si-do new neighbors (8)

## Decisions

- **Circle left 3 = 6 beats**: ContraDB lists 8 beats for the circle, but the dance totals 66 with the trailing do-si-do at 8. Using 6 beats for circle left 3 brings the total to 64, matching the standard contra dance phrase length. This is consistent with other dances in the codebase (e.g. Ellie's Iguanarama).
- **Ladles chain = `robins_chain`**: Mapped "ladles chain" to `robins_chain` with `cid: "opposite"`, same pattern as "Did I Write This?".
- **Roll away**: "gentlespoons roll away neighbors" → `roll_away` with `roller: "lark"`, `rollee: "neighbor"`. The roll away happens from the ring balance position, so `take_hands_in_rings` precedes the balance.
- **Do-si-do at end**: Same wrapping pattern as Jubilation Permutation — fills the last 8 beats of B2.

## No issues encountered

Dance traced cleanly on first attempt.
