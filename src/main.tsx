import "./index.css";

import { enableMapSet } from "immer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import InstructionDefinitionTool from "./InstructionDefinitionTool.tsx";

enableMapSet();

const isDefInstr = window.location.hash === "#def-instr";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isDefInstr ? <InstructionDefinitionTool /> : <App />}
  </StrictMode>,
);
