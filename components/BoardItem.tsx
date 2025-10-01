import React, { useRef, useState, useCallback, useEffect } from 'react';
import { BoardItemData, ItemType } from '../types';
import { PIN_URL, SNAP_THRESHOLD, GRID_SIZE, PIN_OFFSET_Y } from '../constants';
import { ImageItem } from './items/ImageItem';
import { VideoItem } from './items/VideoItem';
import { EmojiItem } from './items/EmojiItem';
import { StickyNote } from './items/StickyNote';
import { ShapeItem } from './items/ShapeItem';

interface BoardItemProps {
  item: BoardItemData;
  onUpdateItems: (updates: Array<{ id: string; updates: Partial<BoardItemData> }>) => void;
  onSelect: (id: string, shiftKey: boolean) => void;
  isSelected: boolean;
  selectedItemIds: string[];
  scale: number;
  setTransientUpdates: React.Dispatch<React.SetStateAction<Record<string, Partial<BoardItemData>>>>;
  shadowDepth: number;
  currentFontFamily: string;
  isEditing: boolean;
  onSetEditing: (isEditing: boolean) => void;
  isNew: boolean;
  allItems: BoardItemData[];
  onStartConnection: (itemId: string, e: React.PointerEvent) => void;
}

const calculateSnapping = (
  currentItem: BoardItemData,
  otherItems: BoardItemData[],
  scale: number
) => {
  const snapThreshold = SNAP_THRESHOLD / scale;
  const snapLines: { x: number[]; y: number[] } = { x: [], y: [] };

  const snapTargets = { x: [] as number[], y: [] as number[] };
  otherItems.forEach(other => {
    snapTargets.x.push(other.x, other.x + other.width / 2, other.x + other.width);
    snapTargets.y.push(other.y, other.y + other.height / 2, other.y + other.height);
  });

  let finalDx = 0;
  let finalDy = 0;
  let minDx = Infinity;
  let minDy = Infinity;

  // Horizontal snapping
  const sourcesX = [currentItem.x, currentItem.x + currentItem.width / 2, currentItem.x + currentItem.width];
  sourcesX.forEach(source => {
    snapTargets.x.forEach(target => {
      const d = target - source;
      if (Math.abs(d) < snapThreshold && Math.abs(d) < Math.abs(minDx)) {
        minDx = d;
      }
    });
  });

  if (minDx !== Infinity) {
    finalDx = minDx;
    const newX = currentItem.x + finalDx;
    const newSourcesX = [newX, newX + currentItem.width / 2, newX + currentItem.width];
    newSourcesX.forEach(source => {
      snapTargets.x.forEach(target => {
        if (Math.abs(source - target) < 0.1) {
          if (!snapLines.x.includes(target)) snapLines.x.push(target);
        }
      });
    });
  } else {
    // Grid snapping for X
    const snappedGridX = Math.round(currentItem.x / GRID_SIZE) * GRID_SIZE;
    const d = snappedGridX - currentItem.x;
    if (Math.abs(d) < snapThreshold) {
      finalDx = d;
    }
  }

  // Vertical snapping
  const sourcesY = [currentItem.y, currentItem.y + currentItem.height / 2, currentItem.y + currentItem.height];
  sourcesY.forEach(source => {
    snapTargets.y.forEach(target => {
      const d = target - source;
      if (Math.abs(d) < snapThreshold && Math.abs(d) < Math.abs(minDy)) {
        minDy = d;
      }
    });
  });

  if (minDy !== Infinity) {
    finalDy = minDy;
    const newY = currentItem.y + finalDy;
    const newSourcesY = [newY, newY + currentItem.height / 2, newY + currentItem.height];
    newSourcesY.forEach(source => {
      snapTargets.y.forEach(target => {
        if (Math.abs(source - target) < 0.1) {
          if (!snapLines.y.includes(target)) snapLines.y.push(target);
        }
      });
    });
  } else {
    // Grid snapping for Y
    const snappedGridY = Math.round(currentItem.y / GRID_SIZE) * GRID_SIZE;
    const d = snappedGridY - currentItem.y;
    if (Math.abs(d) < snapThreshold) {
      finalDy = d;
    }
  }

  return { finalDx, finalDy, snapLines };
};


const ControlHandle: React.FC<{
  onPointerDown: (e: React.PointerEvent) => void;
  cursor: string;
  position: string;
  title: string;
  children: React.ReactNode;
}> = ({ onPointerDown, cursor, position, title, children }) => (
  <div
    onPointerDown={onPointerDown}
    className={`item-control-handle absolute ${position} w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md transform z-10`}
    style={{ cursor }}
    title={title}
  >
    {children}
  </div>
);

export const BoardItem: React.FC<BoardItemProps> = ({
  item, onUpdateItems, onSelect, isSelected, selectedItemIds, scale,
  setTransientUpdates, shadowDepth, currentFontFamily,
  isEditing, onSetEditing, isNew, allItems, onStartConnection,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInteractionStart = useCallback((e: React.PointerEvent, interactionType: 'drag' | 'resize' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(item.id, e.shiftKey);
    const startX = e.clientX;
    const startY = e.clientY;
    
    const isMultiDrag = interactionType === 'drag' && selectedItemIds.length > 1 && selectedItemIds.includes(item.id);
    const itemsToInteract = isMultiDrag
      ? allItems.filter(i => selectedItemIds.includes(i.id))
      : [item];
    const otherItems = allItems.filter(i => !itemsToInteract.find(it => it.id === i.id));
    
    // FIX: Provide generic arguments to the Map constructor to ensure type safety for item states.
    const initialStates = new Map<string, { x: number; y: number; width: number; height: number; rotation: number; }>(itemsToInteract.map(i => [i.id, { x: i.x, y: i.y, width: i.width, height: i.height, rotation: i.rotation }]));

    setIsDragging(interactionType === 'drag');
    let lastClient = { x: startX, y: startY };

    const move = (me: PointerEvent) => {
      lastClient = { x: me.clientX, y: me.clientY };
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      
      const newUpdates: Record<string, Partial<BoardItemData>> = {};
      
      if (interactionType === 'drag') {
        const draggedItemInitial = initialStates.get(item.id)!;
        const currentItemPos = { ...item, x: draggedItemInitial.x + dx, y: draggedItemInitial.y + dy };
        const { finalDx, finalDy } = calculateSnapping(currentItemPos, otherItems, scale);

        const totalDx = dx + finalDx;
        const totalDy = dy + finalDy;

        itemsToInteract.forEach(i => {
          const initialState = initialStates.get(i.id)!;
          newUpdates[i.id] = { x: initialState.x + totalDx, y: initialState.y + totalDy };
        });

      } else if (interactionType === 'resize') {
        const initialState = initialStates.get(item.id)!;
        newUpdates[item.id] = {
            width: Math.max(50, initialState.width + dx),
            height: Math.max(50, initialState.height + dy)
        };
      } else if (interactionType === 'rotate' && itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const a0 = Math.atan2(startY - cy, startX - cx) * (180 / Math.PI);
        const a1 = Math.atan2(me.clientY - cy, me.clientX - cx) * (180 / Math.PI);
        const initialState = initialStates.get(item.id)!;
        newUpdates[item.id] = { rotation: initialState.rotation + (a1 - a0) };
      }

      setTransientUpdates(newUpdates);
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      setTransientUpdates({});
      setIsDragging(false);

      const dx = (lastClient.x - startX) / scale;
      const dy = (lastClient.y - startY) / scale;
      
      if (Math.hypot(dx, dy) < 1) return;

      if (interactionType === 'drag') {
        const draggedItemInitial = initialStates.get(item.id)!;
        const currentItemPos = { ...item, x: draggedItemInitial.x + dx, y: draggedItemInitial.y + dy };
        const { finalDx, finalDy } = calculateSnapping(currentItemPos, otherItems, scale);
        const totalDx = dx + finalDx;
        const totalDy = dy + finalDy;

        const finalUpdates = itemsToInteract.map(i => {
          const initialState = initialStates.get(i.id)!;
          return { id: i.id, updates: { x: initialState.x + totalDx, y: initialState.y + totalDy } };
        });
        onUpdateItems(finalUpdates);

      } else {
        const initialState = initialStates.get(item.id)!;
        let finalUpdate: Partial<BoardItemData> = {};
        if (interactionType === 'resize') {
            finalUpdate = { width: Math.max(50, initialState.width + dx), height: Math.max(50, initialState.height + dy) };
        } else if (interactionType === 'rotate' && itemRef.current) {
            const rect = itemRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const a0 = Math.atan2(startY - cy, startX - cx) * (180 / Math.PI);
            const a1 = Math.atan2(lastClient.y - cy, lastClient.x - cx) * (180 / Math.PI);
            finalUpdate = { rotation: initialState.rotation + (a1 - a0) };
        }
        onUpdateItems([{ id: item.id, updates: finalUpdate }]);
      }
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }, [item, onUpdateItems, onSelect, scale, setTransientUpdates, allItems, selectedItemIds]);

  const handlePinPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onStartConnection(item.id, e);
  };

  const renderContent = () => {
    switch (item.type) {
      case ItemType.Note:
        return <StickyNote item={item} onUpdate={(id, updates) => onUpdateItems([{ id, updates }])} isSelected={isSelected} currentFontFamily={currentFontFamily} isEditing={isEditing} onSetEditing={onSetEditing} />;
      case ItemType.Image:
        return <ImageItem item={item} shadowDepth={shadowDepth} />;
      case ItemType.Video:
        return <VideoItem item={item} isDragging={isDragging} iframeEnabled={isSelected} />;
      case ItemType.Emoji:
        return <EmojiItem item={item} />;
      case ItemType.Shape:
        return <ShapeItem item={item} />;
      default:
        return null;
    }
  };
  
  const isPng = item.type === ItemType.Image && item.content.startsWith('data:image/png');
  // A "Framed Image" is any non-PNG image that has a pin. It gets a polaroid-style frame and shadow.
  const isFramedImage = item.type === ItemType.Image && item.hasPin && !isPng;

  // Container shadow is for notes, videos, AND framed images.
  // Frameless PNGs will get a drop-shadow from the ImageItem component instead.
  const showContainerShadow = item.type === ItemType.Note || item.type === ItemType.Video || isFramedImage;
  
  const boxShadow = showContainerShadow ? `0 ${Math.round(shadowDepth / 2)}px ${shadowDepth * 2}px rgba(0,0,0,${0.02 * shadowDepth}), 0 ${Math.round(shadowDepth / 3)}px ${shadowDepth}px rgba(0,0,0,${0.025 * shadowDepth})` : 'none';
  const shouldShowPin = item.hasPin;
  
  // Add classes for the polaroid frame effect on pinned, non-PNG images.
  const containerStyleClasses = [
    'w-full',
    'h-full',
    'rounded-lg',
    'overflow-hidden',
    isFramedImage ? 'bg-white p-4 pb-10' : ''
  ].filter(Boolean).join(' ');


  return (
    <div
      ref={itemRef}
      data-item-id={item.id}
      className={`absolute transition-shadow duration-200 board-item-container select-none ${isSelected ? 'board-item-selected' : ''} ${isNew ? 'item-appear' : ''}`}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg)`,
        zIndex: item.zIndex
      }}
      onPointerDown={(e) => {
        const eventTarget = e.target;
        
        // Ensure we're working with an Element. If the target is a TextNode, use its parent.
        let target: Element | null = null;
        if (eventTarget instanceof Element) {
            target = eventTarget;
        } else if (eventTarget instanceof Node && eventTarget.parentElement) {
            // This handles Text nodes by getting their containing element.
            target = eventTarget.parentElement;
        }

        if (!target) {
            // If we couldn't resolve to an element, bail out to be safe.
            return;
        }

        // 1. Ignore clicks on interactive controls inside any item.
        if (target.closest('textarea, button, a, .item-control-handle, iframe')) {
          return;
        }

        // 2. For shapes, ignore clicks on the SVG background. Only allow clicks on shape elements.
        if (item.type === ItemType.Shape) {
          if (target.tagName.toLowerCase() === 'svg') {
            return; // Clicked on the transparent SVG canvas, so do nothing.
          }
        }
        
        // 3. Special drag handle for videos.
        if (item.type === ItemType.Video) {
          // If the iframe is enabled (when selected), clicks are captured by it and this
          // handler isn't reached, due to the `closest('iframe')` check above.
          // Clicks on the container or the specific drag handle should always initiate a drag.
          handleInteractionStart(e, 'drag');
          return;
        }

        // 4. Default behavior for all other cases: start dragging.
        handleInteractionStart(e, 'drag');
      }}
    >
      <div className={containerStyleClasses} style={{ cursor: 'grab', boxShadow }}>
        {renderContent()}
      </div>
      {shouldShowPin && (
        <div style={{
          position: 'absolute',
          top: `${PIN_OFFSET_Y}px`,
          left: '50%',
          width: '1px',
          height: '1px',
          zIndex: 10,
          pointerEvents: 'none',
          transform: 'translateX(-50%)',
          transformOrigin: 'center top',
        }}>
          <div 
            className="w-20 h-20"
            style={{
              position: 'absolute',
              bottom: 0, 
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundImage: `url(${PIN_URL})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '50px',
              left: '50%',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              cursor: 'crosshair',
              pointerEvents: 'auto',
            }}
            onPointerDown={handlePinPointerDown}
            title="Drag to connect"
          />
        </div>
      )}
      {isSelected && (
        <>
          <ControlHandle onPointerDown={(e) => handleInteractionStart(e, 'resize')} cursor="se-resize" position="bottom-0 right-0 translate-x-1/2 translate-y-1/2" title="Resize">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-45" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110 2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          </ControlHandle>
          <ControlHandle onPointerDown={(e) => handleInteractionStart(e, 'rotate')} cursor="crosshair" position="top-0 left-0 -translate-x-1/2 -translate-y-1/2" title="Rotate">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
          </ControlHandle>
        </>
      )}
    </div>
  );
};