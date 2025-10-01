import React from 'react';
import { BoardItemData } from '../../types';

export const ShapeItem: React.FC<{ item: BoardItemData }> = ({ item }) => {
  const strokeColor = item.strokeColor || '#374151'; // gray-700
  const strokeWidth = item.strokeWidth || 4;
  const fillColor = item.fillColor || 'transparent';
  const opacity = item.opacity ?? 1;
  const strokeDasharray = item.strokeStyle === 'dashed' ? `${strokeWidth * 2} ${strokeWidth * 1.5}` : undefined;
  const sw = strokeWidth;

  const renderArrow = () => {
    // Relative coordinates for the start and end of the arrow.
    let startRel = { x: 0, y: 0.5 };
    let endRel = { x: 1, y: 0.5 };

    try {
      if (item.content) {
        const points = JSON.parse(item.content);
        if (points.start && points.end) {
          startRel = points.start;
          endRel = points.end;
        }
      }
    } catch (e) {
      // Fallback for arrows created before relative coordinates were stored,
      // or for content that is not a valid JSON.
    }

    const w = item.width;
    const h = item.height;

    // Calculate absolute coordinates from relative coordinates and current dimensions.
    const start = { x: startRel.x * w, y: startRel.y * h };
    const end = { x: endRel.x * w, y: endRel.y * h };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    
    if (length < 1) return null;

    const angle = Math.atan2(dy, dx);
    const arrowColor = strokeColor;
    const tailWidth = strokeWidth;
    const headLength = Math.max(15, Math.min(length * 0.3, tailWidth * 5));
    const headWidth = headLength * 1.2;

    const lineEndX = end.x - headLength * Math.cos(angle);
    const lineEndY = end.y - headLength * Math.sin(angle);

    const anglePerp = angle + Math.PI / 2;
    const headBackP1 = {
      x: lineEndX + (headWidth / 2) * Math.cos(anglePerp),
      y: lineEndY + (headWidth / 2) * Math.sin(anglePerp)
    };
    const headBackP2 = {
      x: lineEndX - (headWidth / 2) * Math.cos(anglePerp),
      y: lineEndY - (headWidth / 2) * Math.sin(anglePerp)
    };
    const headPoints = `${end.x},${end.y} ${headBackP1.x},${headBackP1.y} ${headBackP2.x},${headBackP2.y}`;
    
    return (
      <g style={{ pointerEvents: 'visiblePainted' }}>
        <line
          x1={start.x} y1={start.y}
          x2={lineEndX} y2={lineEndY}
          stroke={arrowColor}
          strokeWidth={tailWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={headPoints}
          fill={arrowColor}
          stroke="none"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  };

  return (
    // FIX: The container div now ignores pointer events, allowing clicks to pass through to elements behind it.
    <div className="w-full h-full bg-transparent" style={{ pointerEvents: 'none', opacity }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${item.width} ${item.height}`}
        // The SVG element itself can receive pointer events, which are then handled by the shape elements inside.
        style={{ overflow: 'visible', pointerEvents: 'auto' }}
      >
        {item.shapeType === 'box' && (
          <rect
            x={sw / 2}
            y={sw / 2}
            width={Math.max(0, item.width - sw)}
            height={Math.max(0, item.height - sw)}
            rx="4"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            strokeDasharray={strokeDasharray}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'all' }}
          />
        )}
        {item.shapeType === 'circle' && (
          <ellipse
            cx={item.width / 2}
            cy={item.height / 2}
            rx={Math.max(0, item.width / 2 - sw / 2)}
            ry={Math.max(0, item.height / 2 - sw / 2)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            strokeDasharray={strokeDasharray}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'all' }}
          />
        )}
        {item.shapeType === 'arrow' && renderArrow()}
      </svg>
    </div>
  );
};