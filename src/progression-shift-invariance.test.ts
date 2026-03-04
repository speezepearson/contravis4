import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, parseProtoId, type ProtoId } from "./contraCore";
import { generateDanceAnimation } from "./generate";
import { NORTH, SOUTH } from "./geometry";
import {
  DanceSchema,
  type Instruction,
  InstructionSchema,
} from "./instructions/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleDancesDir = resolve(__dirname, "../example-dances");
const files = readdirSync(exampleDancesDir).filter((f: string) =>
  f.endsWith(".json"),
);

/**
 * "Teleport 1m in your progression direction; the person in front
 * of you is your new neighbor."
 *
 * This is a 0-beat preamble: a direction-split step (ups go up, downs
 * go down) followed by a relabel that makes "in_front" the new neighbor.
 */
const teleportAndRelabel: Instruction[] = [
  InstructionSchema.parse({
    id: "fd81c037-ed06-4b9b-b7de-9b074778e3be",
    type: "split",
    by: "direction",
    ups: [
      {
        id: "6d4cf45d-db18-4416-bf50-bf4be70828c3",
        beats: 0,
        type: "step",
        direction: "up",
        distance: 1,
        facing: "in_front",
      },
    ],
    downs: [
      {
        id: "e18e7465-2512-4cc2-b7fb-3e58fdeb3db4",
        beats: 0,
        type: "step",
        direction: "down",
        distance: 1,
        facing: "in_front",
      },
    ],
  }),
  InstructionSchema.parse({
    id: "39d20029-01f5-4ba0-bb99-f0ee9849c596",
    beats: 0,
    type: "relabel",
    label: "neighbor",
    cid: "in_front",
  }),
];

function progressionDelta(protoId: ProtoId) {
  return parseProtoId(protoId).dir === "up" ? NORTH : SOUTH;
}

describe("progression shift invariance", () => {
  for (const file of files) {
    const raw = JSON.parse(
      readFileSync(resolve(exampleDancesDir, file), "utf-8"),
    );
    const parseResult = DanceSchema.safeParse(raw);
    if (!parseResult.success) continue;
    const dance = parseResult.data;
    if (dance.instructions.length === 0) continue;

    it(`${dance.name ?? file}`, () => {
      const { animation: origAnim, errors: origErrors } =
        generateDanceAnimation(dance.instructions, dance.initFormation);
      expect(origErrors).toHaveLength(0);
      expect(origAnim).not.toBeNull();
      if (!origAnim) return;

      const modifiedInstructions: Instruction[] = [
        ...teleportAndRelabel,
        ...dance.instructions,
      ];
      const { animation: modAnim, errors: modErrors } = generateDanceAnimation(
        modifiedInstructions,
        dance.initFormation,
      );
      expect(modErrors).toHaveLength(0);
      expect(modAnim).not.toBeNull();
      if (!modAnim) return;

      expect(modAnim.dur).toBe(origAnim.dur);

      // Skip t=0: chainAnimations.getFrame(0) only evaluates the first
      // 0-beat segment. In the modified dance the prepended teleport is
      // that first segment, so the dance's own 0-beat preamble (e.g.
      // take_hands_in_rings) hasn't been applied yet. For any t > 0 all
      // 0-beat segments are correctly skipped and their effects propagate
      // through segment init states.
      for (let t = 0.25; t < origAnim.dur; t += 0.25) {
        const origFrame = origAnim.getFrame(t);
        const modFrame = modAnim.getFrame(t);

        for (const protoId of ALL_PROTO_IDS) {
          const delta = progressionDelta(protoId);
          const expectedPos = origFrame[protoId].pos.add(delta);

          expect(
            modFrame[protoId].pos.x,
            `${protoId} pos.x at t=${t}`,
          ).toBeCloseTo(expectedPos.x, 6);
          expect(
            modFrame[protoId].pos.y,
            `${protoId} pos.y at t=${t}`,
          ).toBeCloseTo(expectedPos.y, 6);

          expect(
            modFrame[protoId].facing.x,
            `${protoId} facing.x at t=${t}`,
          ).toBeCloseTo(origFrame[protoId].facing.x, 6);
          expect(
            modFrame[protoId].facing.y,
            `${protoId} facing.y at t=${t}`,
          ).toBeCloseTo(origFrame[protoId].facing.y, 6);

          // TODO: someday later: check the hands too. This is tricky, punting on it for now.
        }
      }
    });
  }
});
