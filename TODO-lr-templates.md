(persist these instructions to a file in case this conversation gets wiped)

Defining new instructions is laborious. We're going to introduce a tool for defining new ones.


# The new instruction type

We're going to have a new AtomicInstruction type, the `TemplatedLRInstruction`. One of its fields is going to be an identifier for one of a hardcoded set of `LRInstructionTemplate`s; depending on the template, it may need to have additional fields, too (for the foreseeable future, just a `matcher` field detailed below). A TemplatedLRInstruction will generate segments by rubbing the template against some choreographer-provided fields.

Clarifying with code:

```typescript
// src/instructions/templatedLRInstruction.ts
export const LRInstructionTemplateSchema = z.object({
  name: z.string(),
  defaultBeats: z.number(),
  fieldsDisplay: z.array(z.union([
    z.string(),
    z.object({field: z.literal('matcher')}),
  ])),
  matcher: z.discriminatedUnion('type', [
    z.object({type: z.literal('hardcoded'), cid: CalledIdentifierSchema}),
    z.object({type: z.literal('choreographer_specified')}),
  ]),
  /** These relPos and relFacing are relative to the dancer's **initial** coordinate system, e.g. "pos=0" means "the place you started the figure" and "facing=0" means "the direction you were originally facing" */
  keyframes: z.array(z.object({t: BeatsSchema, states: z.record(RoleSchema, z.object({relPos: Vector, relFacing: Vector}))})),
});
export type LRInstructionTemplate = z.infer<typeof LRInstructionTemplateSchema>;

export const ChoreographerSpecifiedLRInstructionFieldsSchema = z.object({
  matcher: CalledIdentifierSchema.optional(),
});
export type ChoreographerSpecifiedLRInstructionFields = z.infer<typeof ChoreographerSpecifiedLRInstructionFieldsSchema>;

export const TemplatedLRInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("templated_lr"),
  templateId: z.enum(Object.keys(allLRTemplates) as Array<typeof keyof allLRTemplates>),
  fields: ChoreographerSpecifiedLRInstructionFieldsSchema,
});
export type TemplatedLRInstruction = z.infer<typeof TemplatedLRInstructionSchema>;

export const templatedLRSegments: InstructionAnimator<TemplatedLRInstruction> = (instr, init) => {
  const template = allLRTemplates[instr.templateId];
  const orig = (d: Dancer) => d.at(init);
  const matcher = ((): CalledIdentifier => {
    switch (template.matcher.type) {
      case 'hardcoded':
        return template.matcher.cid;
      case 'choreographer_specified':
        return must(instr.fields.matcher, ['choreographer-specified matcher is required']);
      default:
        assertNever(template.matcher);
    }
  })();
  const _getInitMatch = (d: Dancer) => orig(d).resolveMatch(matcher, { roles: "different" });
  // ^this might not actually currently get used, but it will eventually

  return instr.template.keyframes.map((kf) => {
    // during each segment, lerp each dancer from [their pos+facing after the previous keyframe] to [their pos+facing in this keyframe]
    // careful that relPos and relFacing are computed relative to orig(dancer), not each segment-initial dancer
  });
}

// src/instructions/templates/index.ts
import { specialChainTemplate } from './specialChain.ts'
export const allLRTemplates = {
  specialChain: specialChainTemplate
}

// src/instructions/templates/specialChain.ts
export const specialChainTemplate: LRInstructionTemplate = {
  name: 'special chain',
  defaultBeats: 8,
  matcher: {type: 'choreographer_specified'},
  fieldsDisplay: ['robins chain with a flourish to your', {field: 'matcher'}],
  keyframes: [/* ... */],
};

// src/example-dances/lr-template.dummy.dance.ts
const myDance: Dance = {
  name: 'my dance',
  initFormation: 'becket',
  instructions: [
    {
      type: 'templated_lr',
      beats: 8,
      template: specialChainTemplate,
      fields: {
        matcher: 'person_across',
      },
    }
  ],
}
```



# The new UI

If the window url fragment is `#def-instr`, don't show the existing normal UI (the "choreography UI").
Instead, we'll show the "instruction definition tool."

The way that works is like so:
- the left half of the screen shows a contra dance set, just like the existing UI but somewhat zoomed in (don't worry about how it displays on mobile)
- the right half of the screen is controls for me to define a LRInstructionTemplate, which I can export as JSON.

I should be able to enter a mode where I prepare the "initial state" for the template. I should be able to paste in a WorldState as JSON, or click and drag dancers around. (Click and drag changes pos; shift-click and drag changes facing.)

I should be able to enter a mode where I'm entering keyframes for a dancer. When I enter that mode:
- there's a control for "keyframe duration", default 1.
- the dancer I'm entering keyframes for is highlighted.
- I can click and drag anywhere on the canvas; when I release, it appends a new keyframe, {keyframe dur} after the last, with the dancer [pos=where my click started], [facing=the direction from there to where I released].
  - While I'm dragging, I should see a ghost of the dancer with that pos+facing
- I should also see ghosts of the dancer at every keyframe I've entered so far
- (the dancer should always be drawn non-ghostly-ly at their initial pos)

I should be able to enter the name + default beats.
I should be able to enter a hardcoded matcher or indicate that the choreographer will need to supply it.
I should be able to enter the fieldsDisplay.
I should be able to export the current total LRInstructionTemplate as JSON.
I should be able to paste in JSON for a template (to load a previously exported one).
