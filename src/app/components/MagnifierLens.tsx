
"use client";

import { useRef, useState } from "react";
import type { ReactNode, PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

type MagnifierLensProps = {
  children: ReactNode;
  zoomFactor?: number;
  lensSize?: number;
};

type Point = {
  x: number;
  y: number;
};

export default function MagnifierLens({
  children,
  zoomFactor = 2,
  lensSize = 170,
}: MagnifierLensProps) {
  const [hovering, setHovering] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });

  const [touchZoom, setTouchZoom] = useState({
    active: false,
    scale: zoomFactor,
    x: 0,
    y: 0,
  });

  const pointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{
    distance: number;
    scale: number;
  } | null>(null);

  const gesture = useRef({
    pinched: false,
    moved: false,
    startX: 0,
    startY: 0,
  });

  const touchInteraction = useRef(false);
  const lastTap = useRef(0);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;

    touchInteraction.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    pointers.current.set(e.pointerId, point);

    if (pointers.current.size === 1) {
      gesture.current = {
        pinched: false,
        moved: false,
        startX: point.x,
        startY: point.y,
      };
    }

    if (pointers.current.size === 2) {
      gesture.current.pinched = true;

      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      pinchStart.current = {
        distance: Math.max(distance, 1),
        scale: touchZoom.active ? touchZoom.scale : zoomFactor,
      };

      setTouchZoom({
        active: true,
        scale: pinchStart.current.scale,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      });
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();

    const point = {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };

    if (e.pointerType === "touch") {
      if (!pointers.current.has(e.pointerId)) return;

      pointers.current.set(e.pointerId, point);

      if (pointers.current.size === 1) {
        const dx = point.x - gesture.current.startX;
        const dy = point.y - gesture.current.startY;

        if (Math.hypot(dx, dy) > 8) {
          gesture.current.moved = true;
        }

        return;
      }

      if (pointers.current.size >= 2 && pinchStart.current) {
        const [a, b] = Array.from(pointers.current.values());

        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const scale = Math.min(
          4,
          Math.max(
            1.2,
            pinchStart.current.scale *
              (distance / pinchStart.current.distance)
          )
        );

        setTouchZoom({
          active: true,
          scale,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        });
      }

      return;
    }

    setPosition(point);
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;

    pointers.current.delete(e.pointerId);

    if (pointers.current.size === 0) {
        if (!gesture.current.pinched && !gesture.current.moved) {
        const now = Date.now();

        if (now - lastTap.current < 300) {
            setTouchZoom((current) => ({
            ...current,
            active: !current.active,
            scale: zoomFactor,
            }));

            lastTap.current = 0;
        } else {
            lastTap.current = now;
        }
        }

      pinchStart.current = null;
    }
  }

  function handlePointerCancel(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }
  }

  return (
    <div
      className="relative h-full w-full overflow-visible touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovering(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setHovering(false);
      }}
      onClickCapture={(e) => {
        if (touchInteraction.current) {
          e.preventDefault();
          e.stopPropagation();
          touchInteraction.current = false;
        }
      }}
    >
      {children}

      {/* Zoom circular para computador */}
      <AnimatePresence>
        {hovering && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
              style={{
                clipPath: `circle(${lensSize / 2}px at ${position.x}px ${position.y}px)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `scale(${zoomFactor})`,
                  transformOrigin: `${position.x}px ${position.y}px`,
                }}
              >
                {children}
              </div>
            </motion.div>

            <motion.div
              className="pointer-events-none absolute z-50 rounded-full border border-white/50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              style={{
                left: position.x - lensSize / 2,
                top: position.y - lensSize / 2,
                width: lensSize,
                height: lensSize,
                boxShadow: "0 5px 24px rgba(0,0,0,.35)",
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Pinch to Zoom para celular */}
      <AnimatePresence>
        {touchZoom.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${touchZoom.scale})`,
                transformOrigin: `${touchZoom.x}px ${touchZoom.y}px`,
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {touchZoom.active && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-[10px] text-white">
          Toque para fechar o zoom
        </div>
      )}
    </div>
  );
}
