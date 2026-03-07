import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { produce } from "immer";
import { describe, expect, it } from "vitest";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  DancerId,
  getProgDirSign,
  parseProtoId,
  type ProtoId,
} from "./contraCore";
import { generateDanceAnimation } from "./generate";
import { NORTH, SOUTH } from "./geometry";
import { DanceSchema, resolveInitFormation } from "./instructions/index";
import { OtherDirLabelSchema, SameDirLabelSchema } from "./labels";
import { assertNever, parses } from "./utils";
import { Dancer, WorldState } from "./worldState";

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleDancesDir = resolve(__dirname, "../example-dances");
const files = readdirSync(exampleDancesDir).filter((f: string) =>
  f.endsWith(".json"),
);

function progressInitFormation(state: WorldState): WorldState {
  for (const id of ALL_PROTO_IDS) {
    if (state[id].hands.left || state[id].hands.right)
      throw new Error("in init formation nobody should be holding hands");
  }
  return produce(state, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      const offset = getProgDirSign(id);
      const incr = (refId: DancerId) => addOffsetToId(refId, offset);
      draft[id] = new Dancer(id, {
        pos: draft[id].pos.add(progressionDelta(id)),
        facing: draft[id].facing,
        hands: Object.fromEntries(
          Object.entries(draft[id].hands).map(([hand, theirId]) => [
            hand,
            { theirId: incr(theirId.theirId), theirHand: theirId.theirHand },
          ]),
        ),
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- rebuilding labels record with dynamic keys
        labels: Object.fromEntries(
          Object.entries(draft[id].labels).map(([labelStr, theirId]) => {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic label key from Object.entries
            const label = labelStr as keyof (typeof draft)[ProtoId]["labels"];
            return [
              label,
              parses(SameDirLabelSchema, label)
                ? theirId
                : parses(OtherDirLabelSchema, label)
                  ? incr(theirId)
                  : assertNever(label),
            ];
          }),
        ) as (typeof draft)[ProtoId]["labels"],
        recents: draft[id].recents.map((rid) => incr(rid)),
      });
    }
  });
}

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
      const initState = resolveInitFormation(dance.initFormation);
      const { animation: origAnim, errors: origErrors } =
        generateDanceAnimation(dance.instructions, initState);
      expect(origErrors).toEqual([]);
      expect(origAnim).not.toBeNull();
      if (!origAnim) return;

      const modInitState = progressInitFormation(initState);
      const { animation: modAnim, errors: modErrors } = generateDanceAnimation(
        dance.instructions,
        modInitState,
      );
      expect(modErrors).toEqual([]);
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
