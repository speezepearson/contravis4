import isEqual_ from "lodash/isEqual";
import { Vector } from "vecti";
import { z } from "zod";

import { SnazzyError, type SnazzySegment } from "./snazzyError";

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
  return isEqual_(a, b);
}

export function must<T>(x: T | null | undefined, msg?: SnazzySegment[]): T {
  if (x == null) throw new SnazzyError(msg ?? ["Value is null or undefined"]);
  return x;
}

export function parses<Schema extends z.ZodEnum>(
  schema: Schema,
  x: unknown,
): x is z.infer<Schema> {
  return schema.safeParse(x).success;
}

type NTupleHelper<
  N extends number,
  T,
  Accum extends T[],
> = Accum["length"] extends N ? Accum : NTupleHelper<N, T, [...Accum, T]>;

/**
 * NTuple<3, T> = [T, T, T]
 */
export type NTuple<N extends number, T> = NTupleHelper<N, T, []>;
export function isNTuple<N extends number, T>(
  x: T[],
  length: N,
): x is NTuple<N, T> {
  return x.length === length;
}

export function typedParse<Schema extends z.ZodSchema>(
  schema: Schema,
  x: z.input<Schema>,
) {
  return schema.parse(x);
}
export function typedSafeParse<Schema extends z.ZodSchema>(
  schema: Schema,
  x: z.input<Schema>,
) {
  return schema.safeParse(x);
}

export function safeThreshold<T>(
  x: number,
  { neg, pos, tol = 0.1 }: { neg: T; pos: T; tol?: number },
): T | undefined {
  if (Math.abs(x) < tol) {
    return undefined;
  }
  return x > 0 ? pos : neg;
}

export function otherSide(side: "east" | "west"): "east" | "west" {
  return side === "east" ? "west" : "east";
}
export function getSide(pos: Vector): "east" | "west" | undefined {
  return safeThreshold(pos.x, { neg: "west", pos: "east" });
}

/** Shortest distance between two points on a circle of the given circumference. */
export function circularDistance(
  a: number,
  b: number,
  modulus: number,
): number {
  const d = (((a - b) % modulus) + modulus) % modulus;
  return Math.min(d, modulus - d);
}

export function try_<T>(fn: () => T): T | Error {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    return new Error(String(e));
  }
}

export function indexOf<T extends string | number>(
  arr: readonly T[],
  x: T,
): number | undefined {
  const i = arr.indexOf(x);
  if (i === -1) return undefined;
  return i;
}

export type AssertEquals<T, U> = T extends U
  ? U extends T
    ? unknown
    : never
  : never;
export type AssertExtends<T, U> = T extends U ? unknown : never;
// Usage:
null satisfies AssertExtends<1, number>;

export { buildEnumRecord, stripPrefix } from "./typecasts";

export function getSingleton<T>(arr: T[]): T | undefined {
  if (arr.length !== 1) return undefined;
  return arr[0];
}

export function typeUnknownJSONParse(x: string): unknown {
  return JSON.parse(x);
}
