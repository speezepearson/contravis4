import z from "zod";

export const ShadowLabelSchema = z.enum([
  "shadow",
  "shadow 2",
  "shadow 3",
  "shadow 4",
  "shadow 5",
  "shadow 6",
]);

export const OffsetNeighborLabelSchema = z.enum([
  "next neighbor",
  "next x2 neighbor",
  "next x3 neighbor",
  "prev neighbor",
  "prev x2 neighbor",
  "prev x3 neighbor",
]);
export const neighborLabelOffsets = Object.freeze({
  "next neighbor": 1,
  "next x2 neighbor": 2,
  "next x3 neighbor": 3,
  "prev neighbor": -1,
  "prev x2 neighbor": -2,
  "prev x3 neighbor": -3,
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
  "person in right hand",
  "person in left hand",
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

undefined as unknown as OtherDirLabel & SameDirLabel satisfies never;
