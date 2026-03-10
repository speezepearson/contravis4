- Don't use typecasts. No `x as T` (`x as const` is okay). Precommit will rightly fail. Do not add eslint-disable directives on your own. Consider using `buildEnumRecord` or `AppropriateZodSchema.parse` instead. If you can't figure it out, ask me for help.

- When writing Instructions, and comparing two floats that might be ~equal, lean towards using `safeThreshold` rather than plain comparisons like `a < b`, so that, if the result is kinda ambiguous / balanced on a knife's edge, we throw. Not a hard rule; use your judgement.

- When you're done with a change:
  - `npm run verify`
  - `npm run verify-noop -- HEAD` -- if your change should have been a functional no-op, all dances should PASS. If you expect your changes to have functional effect but no dances FAIL, let me know. We probably don't have any example-dances yet that exhibit the changed behavior, and we should!
  - Then, if you didn't make any tough judgement calls and you don't have any outstanding questions, commit.
