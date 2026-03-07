import { readFileSync } from "node:fs";

import { expect, test } from "vitest";
import { z } from "zod";

import { DanceSchema } from "./instructions/index";

test("dance.schema.json is up to date", () => {
  const expected = z.toJSONSchema(DanceSchema, { io: "input" });
  const actual = JSON.parse(
    readFileSync(new URL("../dance.schema.json", import.meta.url), "utf-8"),
  );
  expect(actual).toEqual(expected);
});
