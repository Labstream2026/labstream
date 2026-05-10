"use client";

import { useEffect, useRef, useState } from "react";
import type { Annotation } from "@/lib/review";

export type Tool = "pen" | "rect" | "arrow" | "text" | "select";

export type AnnotationCanvasHandle = {
  exportAnnotations: () => Annotation[];
  clear: () => void;
};

type Props = {
  width: number;
  height: number;
  tool: Tool;
  color: string;
  strokeWidth?: number;
  initial?: Annotation[];
  onChange?: (annotations: Annotation[]) => void;
  readOnly?: boolean;
  className?: string;
};

/**
 * Canvas overlay para dibujar anotaciones encima de un video o frame.
 * Coordenadas se almacenan normalizadas 0-1 para que escalen en cualquier tamaño.
 */
export function AnnotationCanvas({
  width,
  height,
  tool,
  color,
  strokeWidth = 3,
  initial,
  onChange,
  readOnly,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(initial ?? []);
  const drawingRef = useRef<{
    start: [number, number];
    points: Array<[number, number]>;
  } | null>(null);

  // Re-render cuando cambian annotations o size
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawAll(ctx, annotations, c.width, c.height);
  }, [annotations, width, height]);

  // Notify parent (callback ref to avoid stale closures)
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current?.(annotations);
  }, [annotations]);

  function getPoint(e: React.PointerEvent): [number, number] {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (readOnly) return;
    if (tool === "select") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    const p = getPoint(e);

    if (tool === "text") {
      const text = window.prompt("Texto:");
      if (text) {
        setAnnotations((prev) => [
          ...prev,
          { kind: "text", x: p[0], y: p[1], text, color, size: 18 },
        ]);
      }
      return;
    }

    drawingRef.current = { start: p, points: [p] };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (readOnly) return;
    if (!drawingRef.current) return;
    const p = getPoint(e);

    if (tool === "pen") {
      drawingRef.current.points.push(p);
      // dibujar incremental
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      drawAll(ctx, annotations, c.width, c.height);
      drawPen(ctx, drawingRef.current.points, color, strokeWidth, c.width, c.height);
      return;
    }

    if (tool === "rect" || tool === "arrow") {
      drawingRef.current.points = [drawingRef.current.start, p];
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      drawAll(ctx, annotations, c.width, c.height);
      if (tool === "rect") {
        drawRect(
          ctx,
          { kind: "rect", x: drawingRef.current.start[0], y: drawingRef.current.start[1], w: p[0] - drawingRef.current.start[0], h: p[1] - drawingRef.current.start[1], color, stroke: strokeWidth },
          c.width,
          c.height,
        );
      } else {
        drawArrow(
          ctx,
          { kind: "arrow", x1: drawingRef.current.start[0], y1: drawingRef.current.start[1], x2: p[0], y2: p[1], color, stroke: strokeWidth },
          c.width,
          c.height,
        );
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (readOnly) return;
    if (!drawingRef.current) return;
    const p = getPoint(e);
    const start = drawingRef.current.start;
    const points = drawingRef.current.points;
    drawingRef.current = null;

    if (tool === "pen") {
      if (points.length < 2) return;
      setAnnotations((prev) => [
        ...prev,
        { kind: "pen", points, color, stroke: strokeWidth },
      ]);
    } else if (tool === "rect") {
      if (Math.abs(p[0] - start[0]) < 0.005) return;
      setAnnotations((prev) => [
        ...prev,
        {
          kind: "rect",
          x: Math.min(start[0], p[0]),
          y: Math.min(start[1], p[1]),
          w: Math.abs(p[0] - start[0]),
          h: Math.abs(p[1] - start[1]),
          color,
          stroke: strokeWidth,
        },
      ]);
    } else if (tool === "arrow") {
      if (Math.abs(p[0] - start[0]) < 0.005 && Math.abs(p[1] - start[1]) < 0.005) return;
      setAnnotations((prev) => [
        ...prev,
        {
          kind: "arrow",
          x1: start[0],
          y1: start[1],
          x2: p[0],
          y2: p[1],
          color,
          stroke: strokeWidth,
        },
      ]);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: readOnly ? "default" : tool === "select" ? "default" : "crosshair",
        pointerEvents: readOnly ? "none" : "auto",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}

// ─── Render helpers ──────────────────────────────────────────────────

function drawAll(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  w: number,
  h: number,
) {
  for (const a of annotations) {
    if (a.kind === "rect") drawRect(ctx, a, w, h);
    else if (a.kind === "arrow") drawArrow(ctx, a, w, h);
    else if (a.kind === "pen") drawPen(ctx, a.points, a.color, a.stroke ?? 3, w, h);
    else if (a.kind === "text") drawText(ctx, a, w, h);
  }
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  a: Extract<Annotation, { kind: "rect" }>,
  w: number,
  h: number,
) {
  ctx.strokeStyle = a.color;
  ctx.lineWidth = a.stroke ?? 3;
  ctx.strokeRect(a.x * w, a.y * h, a.w * w, a.h * h);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  a: Extract<Annotation, { kind: "arrow" }>,
  w: number,
  h: number,
) {
  const x1 = a.x1 * w;
  const y1 = a.y1 * h;
  const x2 = a.x2 * w;
  const y2 = a.y2 * h;
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.lineWidth = a.stroke ?? 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Cabeza
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(8, (a.stroke ?? 3) * 4);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawPen(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  stroke: number,
  w: number,
  h: number,
) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0] * w, points[0][1] * h);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] * w, points[i][1] * h);
  }
  ctx.stroke();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  a: Extract<Annotation, { kind: "text" }>,
  w: number,
  h: number,
) {
  const size = a.size ?? 18;
  ctx.fillStyle = a.color;
  ctx.font = `bold ${size}px Figtree, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  // Sombra para legibilidad
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4;
  ctx.fillText(a.text, a.x * w, a.y * h);
  ctx.shadowBlur = 0;
}

/**
 * Dibuja anotaciones en un canvas (para "burn-in" sobre un screenshot).
 * Usado por el endpoint de frame para guardar el frame con los dibujos encima.
 */
export function paintAnnotationsToCanvas(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  w: number,
  h: number,
) {
  drawAll(ctx, annotations, w, h);
}
