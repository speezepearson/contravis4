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

export function must<T>(x: T | null | undefined): T {
  if (x === null || x === undefined)
    throw new Error("Value is null or undefined");
  return x;
}

export function parses<T>(schema: z.ZodSchema<T>, x: unknown): x is T {
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

export function typedSafeParse<Schema extends z.ZodSchema>(
  schema: Schema,
  x: z.input<Schema>,
) {
  return schema.safeParse(x);
}

export function safeThreshold<T>(
  x: number,
  {
    neg,
    pos,
    tol = 0.1,
    errMsg,
  }: { neg: T; pos: T; tol?: number; errMsg?: string },
): T {
  if (Math.abs(x) < tol) {
    console.error(new Error(errMsg ?? "value is too close to zero"));
    throw new Error(errMsg ?? "value is too close to zero");
  }
  return x > 0 ? pos : neg;
}

export function getSide(
  pos: Vector,
  { errMsg }: { errMsg?: string } = {},
): "east" | "west" {
  return safeThreshold(pos.x, { neg: "west", pos: "east", errMsg });
}

/**
 * Returns the smallest-magnitude number x such that (a+x) and (b-x) differ by a multiple of 2.
 */
export function smallestCrossDyToMakeAlignByMultOfTwo(
  a: number,
  b: number,
  { errMsg }: { errMsg?: string } = {},
): number {
  const halfDiff = (a - b) / 2;
  return safeRound(halfDiff, { errMsg }) - halfDiff;
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

export function safeRound(
  x: number,
  { tol = 0.1, errMsg }: { tol?: number; errMsg?: string } = {},
): number {
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) > 0.5 - tol) {
    throw new Error(errMsg ?? "value is too far from an integer");
  }
  return rounded;
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
