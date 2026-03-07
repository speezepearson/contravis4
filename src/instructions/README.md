# Instruction Types

This document catalogues every instruction type in the dance animation system.

> If you find an example is out of date or incorrect, please update it.

## Heuristics

- **Swings** (incl. meltdown, give and take) should be assumed to **end facing across** unless otherwise specified.
- When a dance calls for a **role-specific instruction** (e.g. "larks allemande left 1½"), model it as a **`split`** instruction. Usually one branch of the split is empty, but some dances have calls like "larks X while robins Y", where both branches have instructions.
- JSON schemas for all types live in `./_generated/`. If missing, regenerate with `npx tsx ./scripts/generate-json-schema.ts`.

## Synonyms

- **"gentlespoons" = "larks" = "gents"** — all refer to the same role, represented as `"lark"` in this system.
- **"ladles" = "robins" = "ladies"** — all refer to the same role, represented as `"robin"` in this system.
- **"shoulder round"** is also called **"gyre"** or **"gypsy"** in some communities.
- **"next neighbor"** is also called **"2nd neighbor"** (and "next x2 neighbor" is "3rd neighbor)
- **"roll away"** is also called **"roll away with a half sashay"**
- **"pass through"** = **`pass_by`** (with `"hand": "right"` by default)

## Common Fields

Every atomic instruction has these base fields:

| Field   | Type     | Description                                            |
| ------- | -------- | ------------------------------------------------------ |
| `id`    | `string` | UUID unique to this instruction                        |
| `beats` | `number` | Duration in beats (0 for "instant" setup instructions) |
| `type`  | `string` | Discriminator — one of the types below                 |

## Common Field Types

**`cid`** (CalledIdentifier) — identifies who a dancer interacts with:

- Labels: `"partner"`, `"neighbor"`, `"next_neighbor"`, `"prev_neighbor"`, `"opposite"`, `"shadow"`, etc.
- Positional: `"person_across"`, `"person_in_front"`, `"person_on_left"`, `"person_on_right"`, `"person_in_left_hand"`, `"person_in_right_hand"`, `"person_up"`, `"person_down"`

**`Hand`**: `"left"` or `"right"`

**`Role`**: `"lark"` or `"robin"`

**`CardinalDirection`**: `"across"`, `"out"`, `"up"`, `"down"`

---

## Instruction Catalogue

### `allemande`

```json
{
  "id": "...",
  "beats": 8,
  "type": "allemande",
  "cid": "neighbor",
  "handedness": "left",
  "rotations": 1.5
}
```

### `balance`

```json
{
  "id": "...",
  "beats": 4,
  "type": "balance",
  "cid": "partner"
}
```

### `balance_the_ring`

Balance in a ring (all four dancers).

```json
{
  "id": "...",
  "beats": 4,
  "type": "balance_the_ring"
}
```

### `bend_the_line`

```json
{
  "id": "...",
  "beats": 4,
  "type": "bend_the_line"
}
```

### `box_circulate`

```json
{
  "id": "...",
  "beats": 4,
  "type": "box_circulate"
}
```

### `box_the_gnat`

```json
{
  "id": "...",
  "beats": 4,
  "type": "box_the_gnat",
  "cid": "neighbor"
}
```

### `california_twirl`

```json
{
  "id": "...",
  "beats": 4,
  "type": "california_twirl"
}
```

### `circle`

- `direction`: `"left"` (CCW from above) or `"right"` (CW from above)
- `nPlaces`: number of places to circle

```json
{
  "id": "...",
  "beats": 8,
  "type": "circle",
  "direction": "left",
  "nPlaces": 4
}
```

### `do_si_do`

```json
{
  "id": "...",
  "beats": 8,
  "type": "do_si_do",
  "cid": "neighbor",
  "rotations": 1.0
}
```

### `down_the_hall`

```json
{
  "id": "...",
  "beats": 4,
  "type": "down_the_hall",
  "distance": 1
}
```

### `drop_hands`

Always 0 beats (instant). `which`: `"both"`, `"left"`, `"right"`, or a CalledIdentifier.

```json
{
  "id": "...",
  "beats": 0,
  "type": "drop_hands",
  "which": "both"
}
```

### `face`

Always 0 beats (instant). Reorients dancers.

```json
{
  "id": "...",
  "beats": 0,
  "type": "face",
  "direction": "across"
}
```

### `form_long_waves`

Always 0 beats (instant).

```json
{
  "id": "...",
  "beats": 0,
  "type": "form_long_waves"
}
```

### `form_short_waves`

Always 0 beats (instant).

```json
{
  "id": "...",
  "beats": 0,
  "type": "form_short_waves"
}
```

### `give_and_take_into_swing`

- `drawerRole`: which role draws the other in

```json
{
  "id": "...",
  "beats": 16,
  "type": "give_and_take_into_swing",
  "cid": "neighbor",
  "drawerRole": "lark",
  "endFacing": "across"
}
```

### `greet_new_neighbors`

Always 0 beats (instant). Updates the `neighbor` label.

```json
{
  "id": "...",
  "beats": 0,
  "type": "greet_new_neighbors",
  "cid": "person_on_right"
}
```

### `greet_shadow`

Always 0 beats (instant). Sets a shadow label.

```json
{
  "id": "...",
  "beats": 0,
  "type": "greet_shadow",
  "label": "shadow",
  "cid": "person_on_left"
}
```

### `long_line_in_center`

One role steps to center to form a long line.

```json
{
  "id": "...",
  "beats": 4,
  "type": "long_line_in_center",
  "role": "lark"
}
```

### `long_lines_forward_back`

All dancers walk forward toward the center and back.

```json
{
  "id": "...",
  "beats": 8,
  "type": "long_lines_forward_back"
}
```

### `mad_robin`

- `whoInFront`: which role starts in front (crossing in front of their partner/neighbor)

```json
{
  "id": "...",
  "beats": 8,
  "type": "mad_robin",
  "cid": "neighbor",
  "rotations": 1,
  "whoInFront": "lark"
}
```

### `meltdown_swing`

Right shoulder round 1.5x (8 beats) followed by a swing (remaining beats). Equivalent to a shoulder round into swing as a single compound instruction.

```json
{
  "id": "...",
  "beats": 16,
  "type": "meltdown_swing",
  "cid": "neighbor",
  "endFacing": "across"
}
```

### `pass_by`

```json
{
  "id": "...",
  "beats": 2,
  "type": "pass_by",
  "cid": "neighbor",
  "hand": "right"
}
```

### `petronella`

Spin to the right into the next position in the ring.

```json
{
  "id": "...",
  "beats": 4,
  "type": "petronella"
}
```

### `poussette`

- `backer`: who backs in the first half
- `backerDir`: direction the backer moves initially
- `full`: `true` for full poussette (two halves), `false` for half

```json
{
  "id": "...",
  "beats": 8,
  "type": "poussette",
  "backer": "lark",
  "backerDir": "left",
  "full": true
}
```

### `pull_by`

```json
{
  "id": "...",
  "beats": 2,
  "type": "pull_by",
  "cid": "neighbor",
  "hand": "right"
}
```

### `right_left_through`

```json
{
  "id": "...",
  "beats": 8,
  "type": "right_left_through"
}
```

### `roll_away`

- `roller`: who does the rolling
- `rollee`: who gets rolled — a CalledIdentifier, `"person_on_right"`, `"person_on_left"`, or a label like `"partner"` or `"neighbor"`

```json
{
  "id": "...",
  "beats": 4,
  "type": "roll_away",
  "roller": "lark",
  "rollee": "person_on_right"
}
```

### `rory_o_more`

Slide sideways (typically from waves).

```json
{
  "id": "...",
  "beats": 4,
  "type": "rory_o_more",
  "direction": "right"
}
```

### `slice`

Dancers slide sideways (left or right) while facing across, stepping forward to the center and then back out.

- `direction`: `"left"` or `"right"`

```json
{
  "id": "...",
  "beats": 8,
  "type": "slice",
  "direction": "left"
}
```

### `shoulder_round`

Also known as "gyre" or "gypsy". Dancers orbit each other without touching.

- `handedness`: which shoulder leads (`"right"` = right shoulder round = CW)

```json
{
  "id": "...",
  "beats": 8,
  "type": "shoulder_round",
  "cid": "partner",
  "handedness": "right",
  "rotations": 1.0
}
```

### `square_through`

```json
{
  "id": "...",
  "beats": 8,
  "type": "square_through"
}
```

### `single_file_promenade`

Like a star, but without hands. Dancers orbit in single file around the ring.

- `direction`: `"left"` or `"right"`
- `nPlaces`: number of places to promenade

```json
{
  "id": "...",
  "beats": 8,
  "type": "single_file_promenade",
  "direction": "left",
  "nPlaces": 4
}
```

### `star`

Like a circle, but each dancer's facing is rotated 90° (CCW if left, CW if right) and holds inside hands with the person opposite them in the ring.

- `direction`: `"left"` or `"right"`
- `nPlaces`: number of places to star

```json
{
  "id": "...",
  "beats": 8,
  "type": "star",
  "direction": "left",
  "nPlaces": 4
}
```

### `step`

Move in a direction while facing a (possibly different) direction.

```json
{
  "id": "...",
  "beats": 2,
  "type": "step",
  "direction": "across",
  "distance": 0.5,
  "facing": "towards_person_on_right"
}
```

### `swing`

Swings end facing across by default.

```json
{
  "id": "...",
  "beats": 8,
  "type": "swing",
  "cid": "partner",
  "endFacing": "across"
}
```

### `take_hands`

Always 0 beats (instant).

- `hand`: `"left"`, `"right"`, or `"inside"`

```json
{
  "id": "...",
  "beats": 0,
  "type": "take_hands",
  "cid": "neighbor",
  "hand": "right"
}
```

### `take_hands_in_rings`

Always 0 beats (instant). All four dancers join hands in a ring.

```json
{
  "id": "...",
  "beats": 0,
  "type": "take_hands_in_rings"
}
```

### `turn_alone`

Each dancer turns 180° in place (larks turn left, robins turn right).

```json
{
  "id": "...",
  "beats": 2,
  "type": "turn_alone"
}
```

### `turn_as_a_couple`

Both partners turn 180° together (like a california twirl but conceptually as a unit).

```json
{
  "id": "...",
  "beats": 4,
  "type": "turn_as_a_couple"
}
```

### `up_the_hall`

```json
{
  "id": "...",
  "beats": 4,
  "type": "up_the_hall",
  "distance": 1
}
```

### `zig_zag`

Couples zig-zag along the set, moving sideways in alternating directions.

- `leader`: which role leads
- `leaderDir`: direction of the first zig from the leader's perspective
- `nZigs`: 1, 2, 3, or 4

```json
{
  "id": "...",
  "beats": 6,
  "type": "zig_zag",
  "leader": "lark",
  "leaderDir": "right",
  "nZigs": 2
}
```

---

## `split`

The `split` instruction runs different instructions for different groups of dancers simultaneously. Use this when a dance calls for role-specific moves (e.g. "larks allemande left 1½"). Often one branch is empty — that's fine, the dancers in the empty branch simply hold position.

### Split by role

```json
{
  "id": "...",
  "type": "split",
  "by": "role",
  "larks": [
    {
      "id": "...",
      "beats": 8,
      "type": "allemande",
      "cid": "opposite",
      "handedness": "left",
      "rotations": 1.5
    }
  ],
  "robins": []
}
```

### Split by direction

```json
{
  "id": "...",
  "type": "split",
  "by": "direction",
  "ups": [],
  "downs": [
    {
      "id": "...",
      "beats": 4,
      "type": "california_twirl"
    }
  ]
}
```
