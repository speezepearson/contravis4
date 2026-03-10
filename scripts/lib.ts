import z from "zod";

import { type Dance, DanceSchema } from "../src/instructions";

export async function loadDance(file: string): Promise<Dance> {
  return z.object({ default: DanceSchema }).parse(await import(file)).default;
}
