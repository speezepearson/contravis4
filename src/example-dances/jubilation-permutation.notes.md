# Jubilation Permutation — Transcription Notes

**Source**: https://contradb.com/dances/2344
**Author**: Cary Ravitz
**Formation**: improper

## Structure

A1: neighbors balance & swing (16)
A2: larks allemande left 1½ (8) → partners swing (8)
B1: half hey, larks start left in center (8) → partners swing (8)
B2: circle left 3 (6) → pass through (2) → do-si-do new neighbors (8)

## Decisions

- **Two partner swings**: The dance has partner swings in both A2 and B1. This is unusual but correct — the half hey displaces everyone, so the second partner swing is in a new position.
- **Larks allemande as split**: Modeled as `split` by role with `cid: "opposite"` (the other lark across the set).
- **Circle left 3 = 6 beats**: ContraDB lists this as 6 beats, matching the common pattern of circle 3 (6) + pass through (2) = 8 beats for B2's first half.
- **Do-si-do at end**: The "next neighbors do si do" wraps around — it fills the last 8 beats of B2. On subsequent passes, the A1 balance & swing is with the neighbor you just did a do-si-do with.
- **`greet_new_neighbors` with `person_in_front`**: After circle left 3 + pass through, dancers have progressed past their current neighbors and face new ones ahead.

## No issues encountered

Dance traced cleanly on first attempt.
