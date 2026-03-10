import { useCallback, useEffect, useRef } from "react";

import { Renderer } from "./components/Renderer";
import type { ProtoId } from "./contraCore";
import type { WorldState } from "./worldState";

type HoverCallback = (id: ProtoId | null) => void;

/**
 * Shared hook for canvas-based dance visualizations.
 * Handles: Renderer creation, resize, scroll-to-zoom, draw scheduling,
 * and optional dancer-hover hit-testing.
 */
export function useCanvasRenderer(opts?: { onHoverDancer?: HoverCallback }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const drawFnRef = useRef<() => void>(() => {});
  const drawRafRef = useRef(0);
  const onHoverDancerRef = useRef(opts?.onHoverDancer);
  useEffect(() => {
    onHoverDancerRef.current = opts?.onHoverDancer;
  });

  /** Latest WorldState for hover hit-testing. Callers should update this in their draw fn. */
  const hoverFrameRef = useRef<WorldState | null>(null);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = requestAnimationFrame(() => drawFnRef.current());
  }, []);

  // Canvas setup: Renderer init, ResizeObserver, zoom, hover
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const applySize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      if (!rendererRef.current) {
        rendererRef.current = new Renderer(ctx, w, h);
      } else {
        rendererRef.current.resize(w, h);
      }
      drawFnRef.current();
    };

    applySize();

    // Scroll-to-zoom
    let hoverRaf = 0;
    const onWheel = (e: WheelEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      e.preventDefault();
      const zoomFactor = 1.1;
      const currentZoom = renderer.getZoom();
      const newZoom =
        e.deltaY < 0 ? currentZoom * zoomFactor : currentZoom / zoomFactor;
      renderer.setZoom(Math.max(0.2, Math.min(5, newZoom)));
      cancelAnimationFrame(hoverRaf);
      hoverRaf = requestAnimationFrame(() => drawFnRef.current());
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Hover hit-testing (only active when onHoverDancer is provided)
    const onMouseMove = (e: MouseEvent) => {
      if (!onHoverDancerRef.current) return;
      const renderer = rendererRef.current;
      const frame = hoverFrameRef.current;
      if (!renderer || !frame) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = renderer.hitTestDancer(x, y, frame);
      onHoverDancerRef.current(hit);
    };
    const onMouseLeave = () => {
      onHoverDancerRef.current?.(null);
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    let resizeRaf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(applySize);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeRaf);
      cancelAnimationFrame(hoverRaf);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return {
    canvasRef,
    canvasContainerRef,
    rendererRef,
    drawFnRef,
    hoverFrameRef,
    requestDraw,
  };
}
