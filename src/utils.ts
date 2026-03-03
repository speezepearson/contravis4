import _ from "lodash";
import { Vector } from "vecti";
import { z } from "zod";

export function isLocalStorageAvailable(): boolean {
  try {
    const key = "__storage_test__";
    localStorage.setItem(key, key);
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

export function lerp(a: number, b: number, progressFrac: number): number {
  return a + (b - a) * progressFrac;
}

export function lerpVectors(
  a: Vector,
  b: Vector,
  progressFrac: number,
): Vector {
  return new Vector(lerp(a.x, b.x, progressFrac), lerp(a.y, b.y, progressFrac));
}

export function isEqual<T>(a: T, b: T): boolean {
  return _.isEqual(a, b);
}

export function avgPos(...vs: Vector[]): Vector {
  return vs.reduce((acc, v) => acc.add(v), new Vector(0, 0)).divide(vs.length);
}

export function must<T>(x: T | null | undefined): T {
  if (x === null || x === undefined)
    throw new Error("Value is null or undefined");
  return x;
}

export function parses<T>(schema: z.ZodSchema<T>, x: unknown): x is T {
  return schema.safeParse(x).success;
}
