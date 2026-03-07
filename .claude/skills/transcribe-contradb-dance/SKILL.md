---
name: transcribe-contradb-dance
description: Transcribe a ContraDB dance into an example-dance JSON file.
---

# Transcribing a ContraDB dance into an example-dance JSON file

## Overview

Given a ContraDB URL (e.g. `https://contradb.com/dances/3010`), the user runs `npx tsx scripts/fetch-contradb-dance.ts <url>` to get a human-readable listing of figures. Your job is to turn that listing into a valid `.dance.json` file in `example-dances/`.

## Process

1. **Read the ContraDB output** — note the title, author, formation (the fetcher prints it), and the sequence of figures with beat counts.

2. **Study existing dances** — read a non-dummy example dance (e.g. `ellies-iguanarama.dance.json` or `otters-allemande.dance.json`) to match the format. Also read the petronella dummy if the dance has petronella/ring figures.

3. **Check `src/instructions/README.md`** — this catalogues every instruction type with examples and synonyms. Key synonyms to know:
   - "gentlespoons" / "gents" = larks (use `"lark"` in splits)
   - "ladles" / "ladies" = robins (use `"robin"` in splits)
   - "pass through" = `pass_by` with `"hand": "right"`
   - "gyre" / "gypsy" = `shoulder_round`
   - "roll away with a half sashay" = `roll_away`

4. **Map each figure to instruction(s)** — one ContraDB figure often maps to multiple instructions:
   - "balance & petronella" = `take_hands_in_rings` (0 beats) + `balance_the_ring` (4 beats) + `petronella` (4 beats)
   - "balance the ring" needs a preceding `take_hands_in_rings` (0 beats) if hands aren't already in rings
   - "circle left 3" needs no preceding `take_hands_in_rings` — the circle instruction calls `makeRingSegment` internally
   - Role-specific moves (e.g. "gentlespoons allemande left 1½") need a `split` wrapper with the active role's instructions and an empty array for the other role
   - Swings should have `"endFacing": "across"` unless otherwise specified
   - **⁋ = progression** — this symbol marks where progression happens. Emit a `greet_new_neighbors` instruction (0 beats) at that point, with `"cid"` probably `"person_in_front"`.

5. **Add `drop_hands` instructions** where needed — swings, allemandes, and other moves leave hands connected. You need `{"beats": 0, "type": "drop_hands", "which": "both"}` before instructions that form new hand connections (like the next swing, circle, or take_hands_in_rings). Check existing dances for the pattern.

6. **Generate valid UUIDs** for all `id` fields — use `node -e "for(let i=0;i<N;i++) console.log(crypto.randomUUID())"`. Do NOT use made-up prefixes like `hb000000-...`; the schema validates UUID format strictly (version 1-8 only).

7. **Create the file** as `example-dances/<kebab-case-name>.dance.json` with `"$schema": "../_generated/json-schemas/Dance.schema.json"`.

8. **Run `npm run verify`** and fix errors iteratively. If simulation errors occur, use `npx tsx scripts/trace-dance.ts <dance.json>` to see the dancer state at each instruction boundary — this shows positions, facings, and hand connections, making it easy to identify where things go wrong.

## Common pitfalls

- **UUID validation**: IDs must be valid v1-v8 UUIDs. Random hex strings with invalid version/variant nibbles will fail schema validation.
- **Hand conflicts**: The simulation tracks hand state precisely. After any instruction that creates hand connections (swing, allemande, circle, take_hands_in_rings), you likely need `drop_hands` before the next instruction that creates new connections.
- **Ring formation edge cases**: `makeRingSegment` (used by circle, take_hands_in_rings, etc.) needs dancers in positions where it can find both a `person_across` and a `person_up`/`person_down` of different role. After partner swings ending across, dancers face horizontally (facing.y ≈ 0), which can cause the ring algorithm to fail when dancers are at y-extremes. This was fixed with a recency-based tiebreaker, but be aware of it.
- **Beat counts**: The dance must total 64 beats. The test suite checks this for non-dummy dances.
- **`cid` for role-specific moves**: In a split, when larks allemande each other, the `cid` is typically `"opposite"` (the other lark across the set), not `"neighbor"` or `"partner"`.

## Debugging tools

- **`npx tsx scripts/trace-dance.ts <dance.json>`** — prints dancer positions, facings, and hand connections after each instruction. Shows errors inline and a summary at the end. Use this instead of writing throwaway test files.
- **`npm run verify-noop -- HEAD`** — after changes, checks that existing dances still produce identical animations.

## What you may need to ask the user

- **Formation**: The fetcher prints this from ContraDB. Confirm if missing or unclear.
- **Missing instruction types**: If a figure doesn't have a corresponding instruction type in `_atomic.ts`, flag it. Don't guess — ask what to substitute or whether to implement it.
- **Ambiguous figures**: Some ContraDB descriptions are terse. If you can't determine the exact parameters (which hand, which role, how many rotations), ask.
