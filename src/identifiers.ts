/**
 * Identifier types and resolution.
 *
 * A "called identifier" resolves to a specific dancer (not a direction vector).
 *
 *   BaseCalledIdentifier = { type: 'label', label } | { type: 'PersonInDirection', dir, onlyRole }
 *     The atomic identifier types: label or person-in-direction.
 *
 *   CalledIdentifier = BaseCalledIdentifier
 *     | { type: 'PerRole', larks, robins }       — different identifier for larks vs robins
 *     | { type: 'PerProgDir', ups, downs }       — different identifier for ups vs downs
 *
 * Resolution is done via Dancer methods (see worldState.ts):
 *   dancer.resolveCalledIdentifier(cid)
 *   dancer.resolveMatch(cid)
 *
 * See also: directions.ts for CalledDirection, which resolves to a direction
 * vector rather than a specific dancer.
 */

import { z } from "zod";

import { type ProgressionDir, type Role } from "./contraCore";
import { type PureDirection, PureDirectionSchema } from "./directions";
import { type Label, LabelSchema } from "./labels";
import { assertNever } from "./utils";

// ── CalledIdentifier: discriminated union identifying a specific dancer ───

export const OnlyRoleSchema = z.enum(["same", "different"]);
export type OnlyRole = z.infer<typeof OnlyRoleSchema>;

export const LabelVariantSchema = z.object({
  type: z.literal("label"),
  label: LabelSchema,
});

export const PersonInDirectionVariantSchema = z.object({
  type: z.literal("PersonInDirection"),
  dir: PureDirectionSchema,
  onlyRole: OnlyRoleSchema,
});

// Base: the atomic identifier types (no wrappers).
export const BaseCalledIdentifierSchema = z.discriminatedUnion("type", [
  LabelVariantSchema,
  PersonInDirectionVariantSchema,
]);
export type BaseCalledIdentifier = z.infer<typeof BaseCalledIdentifierSchema>;

export const PerRoleIdentifierVariantSchema = z.object({
  type: z.literal("PerRole"),
  larks: BaseCalledIdentifierSchema,
  robins: BaseCalledIdentifierSchema,
});

const PerProgDirIdentifierVariantSchema = z.object({
  type: z.literal("PerProgDir"),
  ups: BaseCalledIdentifierSchema,
  downs: BaseCalledIdentifierSchema,
});

// Full CalledIdentifier: base types + wrapper types.
export const CalledIdentifierSchema = z.discriminatedUnion("type", [
  LabelVariantSchema,
  PersonInDirectionVariantSchema,
  PerRoleIdentifierVariantSchema,
  PerProgDirIdentifierVariantSchema,
]);
export type CalledIdentifier = z.infer<typeof CalledIdentifierSchema>;

// ── Constructor helpers ─────────────────────────────────────────────────

export function labelId(
  label: Label,
): BaseCalledIdentifier & { type: "label" } {
  return { type: "label", label };
}
export function personInDir(
  dir: PureDirection,
  onlyRole: OnlyRole,
): BaseCalledIdentifier & { type: "PersonInDirection" } {
  return { type: "PersonInDirection", dir, onlyRole };
}
export function perRoleId(
  larks: BaseCalledIdentifier,
  robins: BaseCalledIdentifier,
): CalledIdentifier & { type: "PerRole" } {
  return { type: "PerRole", larks, robins };
}
export function perProgDirId(
  ups: BaseCalledIdentifier,
  downs: BaseCalledIdentifier,
): CalledIdentifier & { type: "PerProgDir" } {
  return { type: "PerProgDir", ups, downs };
}

// ── All possible base CalledIdentifier values (for UI enumeration) ───────

export const ALL_BASE_CALLED_IDENTIFIERS: BaseCalledIdentifier[] = [
  ...LabelSchema.options.map((label) => labelId(label)),
  ...PureDirectionSchema.options.flatMap((dir) =>
    OnlyRoleSchema.options.map((onlyRole) => personInDir(dir, onlyRole)),
  ),
];

/** @deprecated Use ALL_BASE_CALLED_IDENTIFIERS instead */
export const ALL_CALLED_IDENTIFIERS: BaseCalledIdentifier[] =
  ALL_BASE_CALLED_IDENTIFIERS;

// ── Serialization (for use as dropdown keys, etc.) ──────────────────────

export function baseCalledIdentifierToKey(cid: BaseCalledIdentifier): string {
  switch (cid.type) {
    case "label":
      return `label:${cid.label}`;
    case "PersonInDirection":
      return `PersonInDirection:${cid.dir}:${cid.onlyRole}`;
    default:
      assertNever(cid);
  }
}

export function baseCalledIdentifierFromKey(key: string): BaseCalledIdentifier {
  const [type, ...rest] = key.split(":");
  const val = rest.join(":");
  switch (type) {
    case "label":
      return labelId(LabelSchema.parse(val));
    case "PersonInDirection": {
      const [dir, onlyRole] = val.split(":");
      return personInDir(
        PureDirectionSchema.parse(dir),
        OnlyRoleSchema.parse(onlyRole),
      );
    }
    default:
      throw new Error(`Invalid BaseCalledIdentifier key: ${key}`);
  }
}

export function calledIdentifierToKey(cid: CalledIdentifier): string {
  switch (cid.type) {
    case "label":
    case "PersonInDirection":
      return baseCalledIdentifierToKey(cid);
    case "PerRole":
      return `PerRole:${baseCalledIdentifierToKey(cid.larks)}|${baseCalledIdentifierToKey(cid.robins)}`;
    case "PerProgDir":
      return `PerProgDir:${baseCalledIdentifierToKey(cid.ups)}|${baseCalledIdentifierToKey(cid.downs)}`;
    default:
      assertNever(cid);
  }
}

export function calledIdentifierFromKey(key: string): CalledIdentifier {
  const [type, ...rest] = key.split(":");
  const val = rest.join(":");
  switch (type) {
    case "label":
    case "PersonInDirection":
      return baseCalledIdentifierFromKey(key);
    case "PerRole": {
      const [larksKey, robinsKey] = val.split("|");
      return perRoleId(
        baseCalledIdentifierFromKey(larksKey),
        baseCalledIdentifierFromKey(robinsKey),
      );
    }
    case "PerProgDir": {
      const [upsKey, downsKey] = val.split("|");
      return perProgDirId(
        baseCalledIdentifierFromKey(upsKey),
        baseCalledIdentifierFromKey(downsKey),
      );
    }
    default:
      throw new Error(`Invalid CalledIdentifier key: ${key}`);
  }
}

// ── Pure functions ──────────────────────────────────────────────────────

export function inferRoleOfCalledIdentifier(
  cid: CalledIdentifier,
): "same" | "different" | null {
  switch (cid.type) {
    case "PersonInDirection":
      return cid.onlyRole;
    case "label":
      switch (cid.label) {
        case "neighbor":
        case "next_neighbor":
        case "next_x2_neighbor":
        case "next_x3_neighbor":
        case "prev_neighbor":
        case "prev_x2_neighbor":
        case "prev_x3_neighbor":
        case "partner":
        case "shadow":
        case "shadow_2":
        case "shadow_3":
        case "shadow_4":
        case "shadow_5":
        case "shadow_6":
          return "different";
        case "opposite":
          return "same";
      }
      return null;
    case "PerRole":
    case "PerProgDir":
      return null;
    default:
      assertNever(cid);
  }
}

/**
 * Returns the base identifier that applies for a dancer with the given role and progression direction.
 * For base types, returns the identifier itself. For composite types, selects the appropriate branch.
 */
export function resolveCalledIdentifierForDancer(
  cid: CalledIdentifier,
  role: Role,
  progDir: ProgressionDir,
): BaseCalledIdentifier | null {
  switch (cid.type) {
    case "label":
    case "PersonInDirection":
      return cid;
    case "PerRole":
      return role === "lark" ? cid.larks : cid.robins;
    case "PerProgDir":
      return progDir === "up" ? cid.ups : cid.downs;
    default:
      assertNever(cid);
  }
}
