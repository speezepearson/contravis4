import { describe, expect, it } from "vitest";

import { parseDanceInstruction } from "./parseDanceInstruction";

describe("parseDanceInstruction", () => {
  it("returns empty array for empty string", () => {
    expect(parseDanceInstruction("")).toEqual([]);
  });

  it("returns empty array for unrecognized text", () => {
    expect(parseDanceInstruction("do a backflip")).toEqual([]);
  });

  describe("simple instructions", () => {
    it("parses 'partners swing for 8 beats'", () => {
      const result = parseDanceInstruction("partners swing for 8 beats");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("swing");
      if (instr.type !== "swing") throw new Error("wrong type");
      expect(instr.cid).toEqual({ type: "label", label: "partner" });
      expect(instr.beats).toBe(8);
    });

    it("parses 'neighbors balance and swing'", () => {
      const result = parseDanceInstruction("neighbors balance and swing");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("balance_and_swing");
      if (instr.type !== "balance_and_swing") throw new Error("wrong type");
      expect(instr.cid).toEqual({ type: "label", label: "neighbor" });
    });

    it("parses 'circle left 3 places'", () => {
      const result = parseDanceInstruction("circle left 3 places");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("circle");
      if (instr.type !== "circle") throw new Error("wrong type");
      expect(instr.direction).toBe("left");
      expect(instr.nPlaces).toBe(3);
    });

    it("parses 'do si do your neighbor'", () => {
      const result = parseDanceInstruction("do si do your neighbor");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("do_si_do");
      if (instr.type !== "do_si_do") throw new Error("wrong type");
      expect(instr.cid).toEqual({ type: "label", label: "neighbor" });
    });

    it("parses 'petronella'", () => {
      const result = parseDanceInstruction("petronella");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("petronella");
    });

    it("parses 'right left through'", () => {
      const result = parseDanceInstruction("right left through");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("right_left_through");
    });

    it("parses 'right and left through'", () => {
      const result = parseDanceInstruction("right and left through");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("right_left_through");
    });

    it("parses 'right & left through' (ampersand)", () => {
      const result = parseDanceInstruction("right & left through");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("right_left_through");
    });

    it("parses 'balance & swing' (ampersand)", () => {
      const result = parseDanceInstruction("neighbors balance & swing");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("balance_and_swing");
      if (instr.type !== "balance_and_swing") throw new Error("wrong type");
      expect(instr.cid).toEqual({ type: "label", label: "neighbor" });
    });

    it("parses 'long lines forward and back'", () => {
      const result = parseDanceInstruction("long lines forward and back");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("long_lines_forward_back");
    });

    it("parses 'balance the ring'", () => {
      const result = parseDanceInstruction("balance the ring");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("balance_the_ring");
    });

    it("parses 'take hands in a ring'", () => {
      const result = parseDanceInstruction("take hands in a ring");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("take_hands_in_rings");
    });

    it("parses 'california twirl'", () => {
      const result = parseDanceInstruction("california twirl");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("california_twirl");
    });
  });

  describe("robins chain (role in name, not a split)", () => {
    it("parses 'robins chain' as a single instruction (not a split)", () => {
      const result = parseDanceInstruction("robins chain");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("robins_chain");
    });

    it("parses 'robins chain to your neighbor'", () => {
      const result = parseDanceInstruction("robins chain to your neighbor");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("robins_chain");
      if (instr.type !== "robins_chain") throw new Error("wrong type");
      expect(instr.cid).toEqual({ type: "label", label: "neighbor" });
    });

    it("parses 'robins chain on the left diagonal'", () => {
      const result = parseDanceInstruction("robins chain on the left diagonal");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("robins_chain");
      if (instr.type !== "robins_chain") throw new Error("wrong type");
      expect(instr.cid).toEqual({
        type: "PersonInDirection",
        dir: "left_diagonal",
        onlyRole: "different",
      });
    });
  });

  describe("allemande with modifiers", () => {
    it("parses 'allemande left 1½'", () => {
      const result = parseDanceInstruction("allemande left 1½");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("allemande");
      if (instr.type !== "allemande") throw new Error("wrong type");
      expect(instr.handedness).toBe("left");
      expect(instr.rotations).toBe(1.5);
    });

    it("parses 'neighbor allemande right once'", () => {
      const result = parseDanceInstruction("neighbor allemande right once");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("allemande");
      if (instr.type !== "allemande") throw new Error("wrong type");
      expect(instr.cid).toEqual({ type: "label", label: "neighbor" });
      expect(instr.handedness).toBe("right");
      expect(instr.rotations).toBe(1);
    });
  });

  describe("role-only instructions (implicit split)", () => {
    it("parses 'larks allemande left 1½' as a split", () => {
      const result = parseDanceInstruction("larks allemande left 1½");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("split");
      if (instr.type !== "split") throw new Error("wrong type");
      expect(instr.by).toBe("role");
      if (instr.by !== "role") throw new Error("wrong by");
      expect(instr.larks).toHaveLength(1);
      expect(instr.larks[0].type).toBe("allemande");
      expect(instr.robins).toHaveLength(0);
    });
  });

  describe("while splits", () => {
    it("parses 'larks dance backwards while robins dance forward'", () => {
      const result = parseDanceInstruction(
        "larks step back 0.5m while robins form a long line in the center",
      );
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("split");
      if (instr.type !== "split") throw new Error("wrong type");
      expect(instr.by).toBe("role");
      if (instr.by !== "role") throw new Error("wrong by");

      expect(instr.larks).toHaveLength(1);
      expect(instr.larks[0].type).toBe("step");

      expect(instr.robins).toHaveLength(1);
      expect(instr.robins[0].type).toBe("long_line_in_center");
    });
  });

  describe("star", () => {
    it("parses 'star left 4 places'", () => {
      const result = parseDanceInstruction("star left 4 places");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("star");
      if (instr.type !== "star") throw new Error("wrong type");
      expect(instr.direction).toBe("left");
      expect(instr.nPlaces).toBe(4);
    });
  });

  describe("hey", () => {
    it("parses 'half hey'", () => {
      const result = parseDanceInstruction("half hey");
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("hey");
      if (instr.type !== "hey") throw new Error("wrong type");
      expect(instr.full).toBe(false);
    });

    it("parses 'gentlespoons start a half hey - lefts in center'", () => {
      const result = parseDanceInstruction(
        "gentlespoons start a half hey - lefts in center, rights on ends",
      );
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("hey");
      if (instr.type !== "hey") throw new Error("wrong type");
      expect(instr.full).toBe(false);
      expect(instr.centerRole).toBe("lark");
      expect(instr.centerHand).toBe("left");
    });

    it("parses 'ladles start a full hey - rights in center'", () => {
      const result = parseDanceInstruction(
        "ladles start a full hey - rights in center",
      );
      expect(result).toHaveLength(1);
      const instr = result[0];
      expect(instr.type).toBe("hey");
      if (instr.type !== "hey") throw new Error("wrong type");
      expect(instr.full).toBe(true);
      expect(instr.centerRole).toBe("robin");
      expect(instr.centerHand).toBe("right");
    });
  });

  describe("default beats", () => {
    it("uses default beats when not specified", () => {
      const result = parseDanceInstruction("swing your partner");
      expect(result).toHaveLength(1);
      const instr = result[0];
      if (instr.type !== "swing") throw new Error("wrong type");
      // makeDefaultInstruction sets swing beats to 16
      expect(instr.beats).toBe(16);
    });

    it("overrides beats when specified", () => {
      const result = parseDanceInstruction("swing your partner for 12 beats");
      expect(result).toHaveLength(1);
      const instr = result[0];
      if (instr.type !== "swing") throw new Error("wrong type");
      expect(instr.beats).toBe(12);
    });
  });
});
