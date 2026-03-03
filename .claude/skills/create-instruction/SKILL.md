---
name: create-instruction
description: Create a new contra dance instruction (schema, animator, UI). Use when the user asks to add a new instruction, figure, or move to the dance system.
---

# Create Instruction

This skill creates a new atomic instruction for the contra dance animation system.

Every instruction requires changes to **5 locations**. Follow each step in order.

## 1. Instruction file: `src/instructions/<name>.ts`

### Schema

```ts
import { z } from "zod";
import { BeatsSchema, RoleSchema, /* ... */ } from "../contraCore";
import { InstructionIdSchema, instructionBaseSchemaFields } from "./_base";

export const FooInstructionSchema = z.object({
  ...instructionBaseSchemaFields,   // { id: UUID, beats: integer }
  type: z.literal("foo"),
  // instruction-specific fields here
});
export type FooInstruction = z.infer<typeof FooInstructionSchema>;
```

To set a default for `beats`, override it instead of spreading:

```ts
export const FooInstructionSchema = z.object({
  id: InstructionIdSchema,
  beats: BeatsSchema.default(4),
  type: z.literal("foo"),
  // ...
});
```

### Segment animator

The segment animator is a curried function: `(instr) => (init, who) => Segment[]`.

```ts
import { type SegmentAnimator } from "./_segment";

export const fooSegments =
  (instr: FooInstruction): SegmentAnimator =>
  (init, who) => {
    // Optional: pre-compute partner lookups, assert formation validity
    return [
      {
        dur: instr.beats,
        position: ...,  // omit = stay put
        facing: ...,    // omit = keep current facing
        hands: ...,     // omit = leave hands unchanged
        labels: ...,    // omit = leave labels unchanged
      },
    ];
  };
```

### Key imports by need

| Need | Import from |
|------|-------------|
| `ellipsePosition`, `PI`, `TWO_PI`, `revolve`, `getDir` | `../geometry` |
| `getRole`, `isLark`, `otherHand`, `otherRole`, `ProtoId`, `Hand`, `RoleSchema` | `../contraCore` |
| `connectHands`, `disconnectHands`, `getDancerState` | `../worldState` |
| `resolveCalledIdentifier`, `findDancerInCalledDirection`, `CalledIdentifierSchema` | `./_base` |
| `arc`, `orbit`, `linearTo`, `lerpFacingTo`, `rotateFacingBy`, `hold`, `holdByRole`, `holdUntil`, `disconnect` | `./_segment` |
| `must` | `../utils` |

### Position primitives

- **`arc(cid, { semiMinor, phi })`** — Elliptical path from dancer to partner. `phi: PI` = swap positions. `semiMinor` sign controls curve direction (typically ±0.25).
- **`orbit(cid, { radians })`** — Circular orbit around midpoint with partner.
- **`linearTo(targetFn)`** — Straight-line interpolation to target position.
- **Custom**: `(id, frac, segInit) => Vector` — full control over position.

### Facing primitives

- **`lerpFacingTo(targetFn)`** — Shortest-arc interpolation to target facing.
- **`rotateFacingBy(radiansFn)`** — Rotate by fixed radians. `radiansFn` receives `id`, can vary by role.
- **Omit** — Facing stays at segment-initial value.

### Hand primitives

- **`hold(hand, cid, theirHand)`** — Hold one hand pair throughout.
- **`holdByRole({ lark: [h, cid, th], robin: [h, cid, th] })`** — Role-dependent hands.
- **`holdUntil(threshold, hand, cid, theirHand)`** — Hold until frac, then disconnect.
- **`disconnect()`** — Remove all hand connections.
- **Custom**: `(id, frac, draft) => void` — call `connectHands(draft, id, myHand, themId, theirHand)` directly.

### Pre-computing partners

When you need role-filtered or direction-based partner lookups (which can't use the `arc`/`hold` primitives that take a `cid`), pre-compute in the animator body:

```ts
(init, who) => {
  const partners = new Map<ProtoId, DancerId>();
  for (const id of who) {
    const found = findDancerInCalledDirection(id, "on_right", init, { roles: "different" });
    if (!found) throw new Error(`${id} has no partner for foo`);
    partners.set(id, found);
  }
  return [{ dur: instr.beats, position: (id, frac, segInit) => {
    const themId = partners.get(id)!;
    // use themId with getDancerState(themId, segInit).pos etc.
  }}];
};
```

## 2. Register in `src/instructions/_atomic.ts`

Add three things:

```ts
// 1. Import
import { FooInstructionSchema, fooSegments } from "./foo";

// 2. Add to AtomicInstructionSchema discriminated union (alphabetical order)
export const AtomicInstructionSchema = z.discriminatedUnion("type", [
  // ...existing...
  FooInstructionSchema,
  // ...existing...
]);

// 3. Add to atomicSegmentAnimators registry (alphabetical order)
export const atomicSegmentAnimators = {
  // ...existing...
  foo: fooSegments,
  // ...existing...
};
```

## 3. Field component: `src/components/fields/FooFields.tsx`

```tsx
import type { AtomicInstruction } from "../../instructions/_atomic";
import { InstructionSchema } from "../../instructions/index";
import type { SubFormProps } from "../fieldUtils";

export function FooFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "foo" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "foo",
      beats: instruction.beats,
      // spread all instruction-specific fields as defaults
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {/* Use <InlineDropdown> and <InlineNumber> for editable fields */}
      {/* Use <CalledIdentifierDropdown> for cid fields */}
      {/* Use <CardinalDirectionDropdown> for endFacing fields */}
    </>
  );
}
```

Available UI components: `InlineDropdown` (from `../InlineDropdown`), `InlineNumber` (from `../InlineNumber`), `CalledIdentifierDropdown` (from `../CalledIdentifierDropdown`), `CardinalDirectionDropdown` (from `../CardinalDirectionDropdown`).

Common field option constants from `../fieldUtils`: `ROLE_OPTIONS`, `HAND_OPTIONS`, `TAKE_HAND_OPTIONS`.

## 4. Wire into `src/components/CommandPane.tsx`

Four changes:

### 4a. Import the field component

```ts
import { FooFields } from "./fields/FooFields";
```

### 4b. Add to `ACTION_OPTIONS` array and `ACTION_LABELS` object

```ts
const ACTION_OPTIONS: ActionOptionType[] = [
  // ...existing...
  "foo",
  // ...
];
const ACTION_LABELS: Record<string, string> = {
  // ...existing...
  foo: "foo",
};
```

### 4c. Add to `doesRequireBeatsInput` switch

Return `true` if the user should be able to edit beats in the UI, `false` for zero-beat instructions like `relabel` or `drop_hands`.

### 4d. Add render case to the instruction fields switch

```tsx
case "foo":
  return <FooFields {...common} instruction={instruction} />;
```

## 5. Wire into `src/components/fieldUtils.ts`

Add a case to `makeDefaultInstruction`:

```ts
case "foo":
  return InstructionSchema.parse({
    id,
    type: "foo",
    // provide sensible defaults for all fields
    // beats can be omitted if the schema has .default()
  });
```

## Verification

After all changes:
1. `npx tsc --noEmit` — must pass with no errors
2. `npm run test` — must pass with no regressions
3. `npm run format && npm run lint -- --fix && npm run typecheck`
