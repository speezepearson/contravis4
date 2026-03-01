import { Vector } from "vecti";

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

export function lerp(a: number, b: number, progressFrac: number): number {
  return a + (b - a) * progressFrac;
}

export function lerpVectors(a: Vector, b: Vector, progressFrac: number): Vector {
  return new Vector(
    lerp(a.x, b.x, progressFrac),
    lerp(a.y, b.y, progressFrac),
  );
}