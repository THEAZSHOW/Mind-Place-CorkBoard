import React, { useState, useRef, useEffect } from 'react';
import { BoardItemData } from '../types';
import { useSpringyConnector } from '../hooks/useSpringyConnector';
import { getConnectorEndpoint } from '../constants';

interface ConnectorProps {
  id: string;
  fromItem: BoardItemData;
  toItem: BoardItemData;
  thickness: number;
  tension: number;
  onDelete: (id: string) => void;
}

export const Connector: React.FC<ConnectorProps> = ({ id, fromItem, toItem, thickness, tension, onDelete }) => {
  const fromPos = getConnectorEndpoint(fromItem);
  const toPos = getConnectorEndpoint(toItem);
  const [showDelete, setShowDelete] = useState(false);
  const hoverTimer = useRef<number>();

  const controlPoint = useSpringyConnector(fromPos, toPos, tension);

  useEffect(() => {
    if (showDelete) {
      window.lucide?.createIcons();
    }
  }, [showDelete]);
  
  const d = `M ${fromPos.x} ${fromPos.y} Q ${controlPoint.x} ${controlPoint.y} ${toPos.x} ${toPos.y}`;

  const handleMouseEnter = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setShowDelete(true);
    }, 700); // 700ms delay before showing delete button
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    setShowDelete(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <g onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Wider, invisible path for easier hovering */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={Math.max(20, thickness + 10)}
        fill="none"
        strokeLinecap="round"
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />
      {/* Visible path */}
      <path
        d={d}
        stroke="#B91C1C"
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))', pointerEvents: 'none' }}
      />
      {showDelete && (
        <foreignObject
          x={controlPoint.x - 16} // Center the 32x32 button
          y={controlPoint.y - 16}
          width="32"
          height="32"
          style={{ pointerEvents: 'auto', overflow: 'visible' }}
        >
          <button
            onClick={handleDeleteClick}
            title="Delete connection"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110 shadow-lg"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <i data-lucide="trash-2" className="w-4 h-4"></i>
          </button>
        </foreignObject>
      )}
    </g>
  );
};