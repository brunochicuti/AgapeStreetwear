
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

type MagnifierLensProps = {
  children: ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  desktopPortal?: boolean;
};

type Point = {
  x: number;
  y: number;
};

type DesktopLensPosition = {
  clientX: number;
  clientY: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export default function MagnifierLens({
  children,
  zoomFactor = 2,
  lensSize = 180,
  desktopPortal = false,
}: MagnifierLensProps) {
  const [hovering, setHovering] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [desktopLensPosition, setDesktopLensPosition] =
  useState<DesktopLensPosition | null>(null);

  const [touchZoom, setTouchZoom] = useState({
    active: false,
    scale: zoomFactor,
    x: 0,
    y: 0,
  });

  const lastTap = useRef(0);
  const touchInteraction = useRef(false);

  const panStart = useRef<{
    pointerX: number;
    pointerY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function getPoint(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  }

function handlePointerEnter(e: ReactPointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse") return;
  console.log("POINTER ENTER:", e.pointerType, e.clientX, e.clientY);

  const rect = e.currentTarget.getBoundingClientRect();

  setPosition(getPoint(e));
  setDesktopLensPosition({
    clientX: e.clientX,
    clientY: e.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
    console.log("LUPA:", {
    hovering: true,
    rect,
    clientX: e.clientX,
    clientY: e.clientY,
    });
  setHovering(true);
}


function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse") return;

  if (e.buttons === 0) {
    e.stopPropagation();
  }

  const rect = e.currentTarget.getBoundingClientRect();

  setPosition(getPoint(e));
  setDesktopLensPosition({
    clientX: e.clientX,
    clientY: e.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
}

useEffect(() => {
  if (!desktopPortal || !hovering) return;

  const acompanharMouse = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;

    const element = wrapperRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();

    const dentro =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!dentro) {
      setHovering(false);
      return;
    }

    setDesktopLensPosition({
      clientX: event.clientX,
      clientY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  document.addEventListener("pointermove", acompanharMouse, true);

  return () => {
    document.removeEventListener("pointermove", acompanharMouse, true);
  };
}, [desktopPortal, hovering]);


  function handlePointerDownCapture(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch" || !touchZoom.active) return;

    e.stopPropagation();
    touchInteraction.current = true;

    const point = getPoint(e);

    panStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      originX: touchZoom.x,
      originY: touchZoom.y,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMoveCapture(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch" || !touchZoom.active || !panStart.current) {
      return;
    }

    e.stopPropagation();

    const start = panStart.current;
    const point = getPoint(e);

    setTouchZoom((current) => ({
    ...current,
    x: start.originX + (e.clientX - start.pointerX),
    y: start.originY + (e.clientY - start.pointerY),
    }));
  }


  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;

    const now = Date.now();

    if (touchZoom.active) {
      if (now - lastTap.current < 350) {
        setTouchZoom((current) => ({
          ...current,
          active: false,
        }));

        panStart.current = null;
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }

      return;
    }

    if (now - lastTap.current < 350) {
      const point = getPoint(e);

      setTouchZoom({
        active: true,
        scale: zoomFactor,
        x: (e.currentTarget.clientWidth / 2 - point.x) * (zoomFactor - 1),
        y: (e.currentTarget.clientHeight / 2 - point.y) * (zoomFactor - 1),
      });

      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }


  function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!touchInteraction.current) return;

    e.preventDefault();
    e.stopPropagation();
    touchInteraction.current = false;
  }

  function handleZoomTouchEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch" || !touchZoom.active) return;

    e.stopPropagation();

    const now = Date.now();

    if (now - lastTap.current < 350) {
      setTouchZoom((current) => ({
        ...current,
        active: false,
      }));
      panStart.current = null;
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative h-full w-full overflow-visible ${
        touchZoom.active ? "touch-none" : "touch-pan-y"
      }`}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onClickCapture={handleClickCapture}
    >
      {children}

      {/* Lupa circular para computador */}
      {/* Lupa circular para computador */}
      {desktopPortal ? (
        <AnimatePresence>
          {hovering &&
            desktopLensPosition &&
            typeof document !== "undefined" &&
            createPortal(
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.12 }}
                className="pointer-events-none fixed z-[2147483647] overflow-hidden rounded-full border-4 border-red-500 bg-red-500/40"
                style={{
                  left: desktopLensPosition.clientX - lensSize / 2,
                  top: desktopLensPosition.clientY - lensSize / 2,
                  width: lensSize,
                  height: lensSize,
                  boxShadow: "0 5px 24px rgba(0,0,0,.35)",
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left:
                      desktopLensPosition.left -
                      (desktopLensPosition.clientX - lensSize / 2),
                    top:
                      desktopLensPosition.top -
                      (desktopLensPosition.clientY - lensSize / 2),
                    width: desktopLensPosition.width,
                    height: desktopLensPosition.height,
                    transform: `scale(${zoomFactor})`,
                    transformOrigin: `${
                      desktopLensPosition.clientX -
                      desktopLensPosition.left
                    }px ${
                      desktopLensPosition.clientY -
                      desktopLensPosition.top
                    }px`,
                  }}
                >
                  {children}
                </div>
              </motion.div>,
              document.body
            )}
        </AnimatePresence>
      ) : (
        <AnimatePresence>
          {hovering && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute z-40 overflow-visible"
                style={{
                  left: -(lensSize / 2),
                  top: -(lensSize / 2),
                  width: `calc(100% + ${lensSize}px)`,
                  height: `calc(100% + ${lensSize}px)`,
                  clipPath: `circle(${lensSize / 2}px at ${
                    position.x + lensSize / 2
                  }px ${position.y + lensSize / 2}px)`,
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: lensSize / 2,
                    top: lensSize / 2,
                    width: `calc(100% - ${lensSize}px)`,
                    height: `calc(100% - ${lensSize}px)`,
                    transform: `scale(${zoomFactor})`,
                    transformOrigin: `${position.x}px ${position.y}px`,
                  }}
                >
                  {children}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute z-50 rounded-full border-2 border-white/70"
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
      )}

      {/* Zoom para celular */}
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
                transform: `translate(${touchZoom.x}px, ${touchZoom.y}px) scale(${touchZoom.scale})`,
                transformOrigin: "center center",
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {touchZoom.active && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-[10px] text-white">
          Dois toques para fechar · Arraste para mover
        </div>
      )}
    </div>
  );
}
