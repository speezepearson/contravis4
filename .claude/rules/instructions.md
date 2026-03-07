---
paths:
  - "src/instructions/**"
---

# Instruction changes

When modifying files in `src/instructions/`:

- If a schema changes (new fields, renamed fields, changed types, new instruction type), regenerate the JSON schemas: `npx tsx ./scripts/generate-json-schema.ts`
- Update `src/instructions/README.md` to reflect any new or changed instruction types, fields, or examples.
