# Basic Becket

- **Source**: https://contradb.com/dances/2515
- **Author**: Mattie Rynkiewicz, Becket

## Dance Card

- A1: 8 long lines forward & back / 8 slice left & back
- A2: 8 circle left 4 places / 8 partners do si do once
- B1: 8 neighbors do si do once / 8 half poussette (robins pull back then left)
- B2: 8 neighbors do si do once / 8 half poussette (larks pull back then left)

## Key Decisions

- **Progression**: Slice left (in A1). Second progression marker at end of B2 just marks the cycle completing.
- **Poussettes**: `backer: "robin"` / `"lark"`, `backerDir: "left"`, `full: false`.
- **`drop_hands`** needed after long_lines (before slice), after circle, and after first poussette (before do_si_do).

## Trouble

1. **Poussette phantom bug** — The poussette non-backer position was slanty because `makeHalfPoussetteArcPosition` looked up the backer by protoId (`Dancer.get(backerProto, dancer.state).pos`), but when the matched dancer is a phantom (e.g. `down_robin_1`), the proto (`down_robin_0`) is at a different y position. The displacement vector got a spurious y component. User fixed this by rewriting the function to compute each dancer's arc independently (both backer and non-backer trace their own elliptical arcs).
2. **zigZag also uses `makeHalfPoussetteArcPosition`** — Changes to the poussette function directly affected zigZag, which reuses it for each zig. The initial fix (capturing match positions at construction time) broke zigZag because it reuses `matches` across iterations with updated `state`. The DancerId-based phantom offset approach also failed shift-invariance. User's rewrite (giving each dancer their own arc) resolved both.
