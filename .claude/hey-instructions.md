# Hey figure implementation notes

## Basic spec
- New figure: hey
- Default 16 beats
- Display: `[hey] ([half|full]): [larks|robins] pass [right|left] in the center`
- Requires all four dancers, like robins chain

## Helper: `getGroupOfFour(d: Dancer): NTuple<4, Dancer>`
Returns in no particular order:
1. `d`
2. The opposite-role dancer across the set from `d`
3. The closest opposite-role dancer on the same side as `d`, ties broken by recency — call this `d2`
4. The dancer across from `d2` with the opposite role from `d2`

Before returning, verify it would produce the same result (modulo reordering) if called on any of the other three dancers.

## Helper: closest opposite-role dancer on same side
"The closest dancer to d on the same side of the set with the opposite role, ties broken by recency"
- Should be extractable from existing ring-forming or fudge logic

## Movement (punting on detailed movement)
- **Full hey**: dancers lerp to `(±0.5 appropriate for their current side, curY)`, then call both fudge functions
- **Half hey**: dancers lerp to `(±0.5 inappropriate for their side, curY of the other dancer with their role in their group of 4)`
- Either way: update every dancer's recents with all the other dancers in their group
