import "./index.css";

import { enableMapSet } from "immer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { danceFromHash } from "./danceUrl.ts";
import InstructionDefinitionTool from "./InstructionDefinitionTool.tsx";
import type { Dance } from "./instructions/index.ts";

enableMapSet();

const isDefInstr = window.location.hash === "#def-instr";

let hashDanceResult: { dance: Dance } | { error: string } | null = null;
if (!isDefInstr && window.location.hash.length > 1) {
  hashDanceResult = await danceFromHash(window.location.hash.slice(1));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isDefInstr ? (
      <InstructionDefinitionTool />
    ) : (
      <App hashDanceResult={hashDanceResult} />
    )}
  </StrictMode>,
);
