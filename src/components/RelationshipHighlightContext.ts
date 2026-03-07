import { createContext } from "react";

import type { ProtoId } from "../contraCore";
import type { CalledIdentifier } from "../instructions/_base";

/** Context for relationship dropdown hover highlighting.
 *  The value is a callback that accepts a CalledIdentifier or null to clear the highlight.
 */
export const CalledIdentifierHighlightContext = createContext<
  (cid: CalledIdentifier | null) => void
>(() => {});

/** Context for dancer hover highlighting from snazzy errors.
 *  The value is a callback that accepts a ProtoId or null to clear the highlight.
 */
export const DancerHighlightContext = createContext<
  (id: ProtoId | null) => void
>(() => {});
