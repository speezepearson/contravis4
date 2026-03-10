import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { produce } from "immer";
import { describe, expect, it } from "vitest";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  type DancerId,
  getProgDir,
  getProgDirSign,
  parseProtoId,
  type ProtoId,
} from "./contraCore";
import { generateDanceAnimation } from "./generate";
import { NORTH, SOUTH } from "./geometry";
import { inferProgression } from "./inferProgression";
import { resolveInitFormation } from "./instructions/index";
import {
  IrreducibleLabelSchema,
  OtherDirLabelSchema,
  SameDirLabelSchema,
} from "./labels";
import { loadDance } from "./testHelpers";
import { assertNever, parses, typedParse } from "./utils";
import { ProtoDancerStateSchema, type WorldState } from "./worldState";

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleDancesDir = resolve(__dirname, "example-dances");
const files = readdirSync(exampleDancesDir).filter((f: string) =>
  f.endsWith(".ts"),
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
      draft[id] = typedParse(ProtoDancerStateSchema, {
        pos: draft[id].pos.add(progressionDelta(id)),
        facing: draft[id].facing,
        hands: Object.fromEntries(
          Object.entries(draft[id].hands).map(([hand, theirId]) => [
            hand,
            { theirId: incr(theirId.theirId), theirHand: theirId.theirHand },
          ]),
        ),
        labels: {
          partner: draft[id].labels.partner,
          neighbor: incr(draft[id].labels.neighbor),
          ...Object.fromEntries(
            Object.entries(draft[id].labels).map(([labelStr, theirId]) => {
              const label = IrreducibleLabelSchema.parse(labelStr);
              return [
                label,
                parses(SameDirLabelSchema, label)
                  ? theirId
                  : parses(OtherDirLabelSchema, label)
                    ? incr(theirId)
                    : assertNever(label),
              ];
            }),
          ),
        },
        recents: draft[id].recents.map((rid) =>
          getProgDir(rid) === getProgDir(id) ? rid : incr(rid),
        ),
      });
    }
  });
}

function progressionDelta(protoId: ProtoId) {
  return parseProtoId(protoId).dir === "up" ? NORTH : SOUTH;
}

describe("progression shift invariance", () => {
  for (const file of files) {
    it(file, async () => {
      const dance = await loadDance(resolve(exampleDancesDir, file));
      if (dance.instructions.length === 0) return;
      if (dance.status !== "verified") return;
      const initState = resolveInitFormation(dance.initFormation);
      const { animation: origAnim, errors: origErrors } =
        generateDanceAnimation(dance.instructions, initState);
      expect(origErrors).toHaveLength(0);
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

      // Check that neighbor labels at the final frame are correctly offset
      // by the inferred progression amount.
      const progression = inferProgression(origAnim, initState);
      if (progression !== null && progression !== 0) {
        const finalFrame = origAnim.getFrame(origAnim.dur);
        for (const protoId of ALL_PROTO_IDS) {
          const initNeighbor = initState[protoId].labels.neighbor;
          const expectedNeighbor = addOffsetToId(
            initNeighbor,
            getProgDirSign(protoId) * progression,
          );
          expect(
            finalFrame[protoId].labels.neighbor,
            `${protoId} neighbor label at end of dance`,
          ).toBe(expectedNeighbor);
        }
      }
    });
  }
});
