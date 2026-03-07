import { writeFileSync } from "node:fs";

import { z } from "zod";

import { DanceSchema } from "../src/instructions/index";

const jsonSchema = z.toJSONSchema(DanceSchema, { io: "input" });

const output = JSON.stringify(jsonSchema, null, 2) + "\n";

const dest = new URL("../dance.schema.json", import.meta.url).pathname;
writeFileSync(dest, output);
console.log(`Wrote ${dest}`);
