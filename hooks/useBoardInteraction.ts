import React, { useState, useEffect, useRef } from 'react';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_SENSITIVITY } from '../constants';

interface Pan {
  x: number;
  y: number;
}

export const useBoardInteraction = (
  ref: React.RefObject<HTMLDivElement>,
  isAreaSelectionMode: boolean,
  isShapeToolActive: boolean
) => {
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.4);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastDist = useRef(0);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const down = (e: PointerEvent) => {
      if (isAreaSelectionMode || isShapeToolActive) return;
      if (e.target instanceof Node && (e.target.isEqualNode(el) || e.target.parentElement?.isEqualNode(el))) {
        e.preventDefault();
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        el.setPointerCapture(e.pointerId);

        if (pointers.current.size === 1) {
          lastPanPoint.current = { x: e.clientX, y: e.clientY };
          el.style.cursor = 'grabbing';
        } else if (pointers.current.size === 2) {
          // FIX: Explicitly type pts to resolve type inference issue.
          const pts: { x: number; y: number }[] = Array.from(pointers.current.values());
          lastDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
      }
    };

    const move = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;

      e.preventDefault();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // FIX: Explicitly type pts to resolve type inference issue.
      const pts: { x: number; y: number }[] = Array.from(pointers.current.values());

      if (pts.length === 1) {
        if (lastPanPoint.current) {
          const dx = e.clientX - lastPanPoint.current.x;
          const dy = e.clientY - lastPanPoint.current.y;
          setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        }
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
      } else if (pts.length === 2) {
        const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastDist.current > 0) {
          const rect = el.getBoundingClientRect();
          const midPoint = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          const mx = midPoint.x - rect.left;
          const my = midPoint.y - rect.top;
          const zoomAmount = newDist / lastDist.current;

          setZoom(currentZoom => {
            const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom * zoomAmount));
            setPan(currentPan => {
              const mouseTo = { x: (mx - currentPan.x) / currentZoom, y: (my - currentPan.y) / currentZoom };
              return { x: mx - mouseTo.x * newZoom, y: my - mouseTo.y * newZoom };
            });
            return newZoom;
          });
        }
        lastDist.current = newDist;
      }
    };

    const up = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      if (pointers.current.size < 2) lastDist.current = 0;
      if (pointers.current.size < 1) {
        lastPanPoint.current = null;
        el.style.cursor = 'grab';
      } else if (pointers.current.size === 1) {
        // FIX: Create a typed array from the iterator to ensure correct type inference for the element.
        const remainingPointers: { x: number; y: number }[] = Array.from(pointers.current.values());
        const remainingPointer = remainingPointers[0];
        lastPanPoint.current = { x: remainingPointer.x, y: remainingPointer.y };
      }
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom(currentZoom => {
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom - e.deltaY * ZOOM_SENSITIVITY));
        setPan(currentPan => {
          const mouseTo = { x: (mx - currentPan.x) / currentZoom, y: (my - currentPan.y) / currentZoom };
          return { x: mx - mouseTo.x * newZoom, y: my - mouseTo.y * newZoom };
        });
        return newZoom;
      });
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [ref, isAreaSelectionMode, isShapeToolActive]);

  return { pan, zoom, setZoom };
};