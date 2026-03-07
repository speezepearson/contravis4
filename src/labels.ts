import z from "zod";

export const ShadowLabelSchema = z.enum([
  "shadow",
  "shadow_2",
  "shadow_3",
  "shadow_4",
  "shadow_5",
  "shadow_6",
]);

export const OffsetNeighborLabelSchema = z.enum([
  "next_neighbor",
  "next_x2_neighbor",
  "next_x3_neighbor",
  "prev_neighbor",
  "prev_x2_neighbor",
  "prev_x3_neighbor",
]);
export const neighborLabelOffsets = Object.freeze({
  next_neighbor: 1,
  next_x2_neighbor: 2,
  next_x3_neighbor: 3,
  prev_neighbor: -1,
  prev_x2_neighbor: -2,
  prev_x3_neighbor: -3,
}) satisfies Record<z.infer<typeof OffsetNeighborLabelSchema>, number>;

export const NeighborLabelSchema = z.enum([
  "neighbor",
  ...OffsetNeighborLabelSchema.options,
]);
export const LabelSchema = z.enum([
  "partner",
  ...NeighborLabelSchema.options,
  ...ShadowLabelSchema.options,
  "opposite", // = my neighbor's partner
  "person_in_right_hand",
  "person_in_left_hand",
]);

export const InfallibleLabelSchema = z.enum([
  "partner",
  ...NeighborLabelSchema.options,
  "opposite",
] satisfies Label[]);
export const SymmetricLabelSchema = z.enum([
  "partner",
  ...NeighborLabelSchema.options,
  ...ShadowLabelSchema.options,
  "opposite",
] satisfies Label[]);
export const OtherDirLabelSchema = z.enum([
  ...NeighborLabelSchema.options,
  "opposite",
] satisfies Label[]);
export const SameDirLabelSchema = z.enum([
  "partner",
  ...ShadowLabelSchema.options,
] satisfies Label[]);
export const IrreducibleLabelSchema = z.enum([
  "partner",
  "neighbor",
  ...ShadowLabelSchema.options,
] satisfies Label[]);
export const SettableLabelSchema = z.enum([
  "neighbor",
  ...ShadowLabelSchema.options,
]);

export type Label = z.infer<typeof LabelSchema>;
export type InfallibleLabel = z.infer<typeof InfallibleLabelSchema>;
export type SymmetricLabel = z.infer<typeof SymmetricLabelSchema>;
export type OtherDirLabel = z.infer<typeof OtherDirLabelSchema>;
export type SameDirLabel = z.infer<typeof SameDirLabelSchema>;
export type ShadowLabel = z.infer<typeof ShadowLabelSchema>;
export type IrreducibleLabel = z.infer<typeof IrreducibleLabelSchema>;
export type SettableLabel = z.infer<typeof SettableLabelSchema>;

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- AssertExtends doesn't work with RHS never
null as unknown as OtherDirLabel & SameDirLabel satisfies never;
