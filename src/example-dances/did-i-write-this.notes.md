# Did I Write This? - Transcription Notes

Source: https://contradb.com/dances/2490

## Key Decisions

### "Ladles chain" = `robins_chain` with `cid: "opposite"`

After partner swing ending across and long lines, the robins are diagonal from each other
(not directly across the set). The `"neighbor"` cid fails because it resolves to a
different-role dancer. The `"person_across"` cid fails because the angle between "across"
(east/west) and the diagonal is too large (~45 degrees) for `findDancerInDirection`.
Using `"opposite"` works because it resolves via labels: neighbor's partner = the other robin.

### "Ones swing" = split by direction, downs swing

The "ones" (dancers currently in #1 position) are the `down` proto dancers at this point
in the dance. Through the sequence of neighbor swing, circle left 3, partner swing, long
lines, chain, and long lines, the `down` protos end up at y=-0.50 (the "up"/north position
in the set), making them the #1 couple.

### Swing endFacing "down" + step out

The ones swing partners across the set from each other (at x=-0.50 and x=0.50). The center
of the swing is at x=0, which prevents `endFacing: "across"` from working (the system can't
determine which side is east/west at x=0). Instead, the swing uses `endFacing: "down"` (6 beats),
followed by a 2-beat step "out" with facing "across" to move the dancers to x=+/-0.50 for
correct progression inference.

### No `greet_new_neighbors` needed

Progression is inferred purely from positional movement. After the ones swing + step out,
all dancers have moved 1 unit in their progression direction. Adding `greet_new_neighbors`
caused offset asymmetry errors because `person_down` resolves to different offsets for up vs
down proto dancers when they've swapped positions.

## Beat Allocation (64 total)

- Neighbors balance & swing: 4 + 12 = 16
- Circle left 3: 8
- Partners swing: 8
- Long lines forward & back: 8
- Ladles chain: 8
- Long lines forward & back: 8
- Ones swing (split): 6 swing + 2 step = 8
