import "./index.css";

import { enableMapSet } from "immer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { danceFromHash } from "./danceUrl.ts";
import type { Dance } from "./instructions/index.ts";

enableMapSet();

let hashDanceResult: { dance: Dance } | { error: string } | null = null;
if (window.location.hash.length > 1) {
  hashDanceResult = await danceFromHash(window.location.hash.slice(1));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App hashDanceResult={hashDanceResult} />
  </StrictMode>,
);
