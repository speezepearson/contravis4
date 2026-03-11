/**
 * Generic typecast utilities.
 *
 * This file centralizes all `as T` type assertions so that the rest of the
 * codebase can stay cast-free. Three important invariants:
 *
 *  (a) This module is **fully generic** — it must not import any
 *      project-specific modules, only Zod (and the TypeScript type system).
 *
 *  (b) This should be the **only** file in the project that disables the
 *      `@typescript-eslint/consistent-type-assertions` lint rule.
 *
 *  (c) Every function here must be **semantically meaningful** — it should
 *      transform its inputs in a way that makes the resulting typecast
 *      completely sound, even if we can't prove it to the compiler. No
 *      generic `cast<T>(x): T` escape hatches.
 */

import { z } from "zod";

/**
 * Build a `Record<K, V>` from a Zod enum schema by applying `f` to each
 * variant. `Object.fromEntries` can't express the precise return type, so this
 * helper encapsulates the necessary cast.
 */
export function buildEnumRecord<Schema extends z.ZodEnum, V>(
  schema: Schema,
  f: (x: Schema["options"][number]) => V,
): Record<z.infer<Schema>, V> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.fromEntries can't return a precise Record type
  return Object.fromEntries(schema.options.map((x) => [x, f(x)])) as Record<
    z.infer<Schema>,
    V
  >;
}

/**
 * Strip a known prefix from a string literal type.
 * TypeScript can infer the result type but can't verify that `slice` produces
 * it, so this helper encapsulates the cast.
 */
export function stripPrefix<P extends string, S extends `${P}${string}`>(
  prefix: P,
  s: S,
): S extends `${P}${infer Rest}` ? Rest : never {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return s.slice(prefix.length) as never;
}

/**
 * Resolve a CJS module namespace that may have been wrapped by an ESM bundler.
 *
 * Some bundlers (e.g. Vite) expose CJS named exports directly on the
 * namespace, while others (e.g. Node ESM) nest them under `.default`.
 * This helper inspects the namespace at runtime and returns a
 * correctly-typed reference either way.
 *
 * @param ns         The imported namespace (`import * as ns from "…"`)
 * @param sentinel   A key that is known to exist on the real module exports
 *                   (used to detect whether the namespace needs unwrapping)
 */
export function resolveCjsDefault<T extends object>(
  ns: T,
  sentinel: keyof T & string,
): T {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- CJS/ESM interop requires runtime detection
  const g = ns as Record<string, unknown>;
  if (typeof g[sentinel] === "function") {
    return ns;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- CJS/ESM interop requires runtime detection
  return g["default"] as object as T;
}

/**
 * Assign a value to a property on `globalThis` for debugging /
 * browser-automation purposes, without requiring an `as any` cast at the
 * call site.
 */
export function assignToGlobalThis(key: string, value: unknown): void {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- debug-only globalThis assignment
  (globalThis as any)[key] = value;
}
