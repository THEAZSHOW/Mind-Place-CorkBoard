import React from 'react';
import { BoardItemData } from '../../types';

interface ImageItemProps {
  item: BoardItemData;
  shadowDepth: number;
}

export const ImageItem: React.FC<ImageItemProps> = ({ item, shadowDepth }) => {
  const isPng = item.content.startsWith('data:image/png');

  // Only apply drop-shadow to PNGs, which are treated as frameless "cutouts".
  // Framed JPGs will get their shadow from the BoardItem container's box-shadow.
  const dropShadowFilter = isPng
    ? `drop-shadow(0 ${Math.round(shadowDepth / 2)}px ${shadowDepth}px rgba(0,0,0,${0.02 * shadowDepth})) drop-shadow(0 ${Math.round(shadowDepth / 3)}px ${Math.round(shadowDepth / 2)}px rgba(0,0,0,${0.025 * shadowDepth}))`
    : 'none';

  // This logic is correct: for PNGs, let clicks pass through the transparent container
  // so the browser can determine if a non-transparent pixel on the image was clicked.
  // For other image types, the container itself is the clickable area.
  const divPointerEvents = isPng ? 'none' : 'auto';
  const imgPointerEvents = isPng ? 'auto' : 'none';

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent" style={{ pointerEvents: divPointerEvents }}>
      <img
        src={item.content}
        alt="User content"
        className="w-full h-full object-contain"
        style={{ 
          filter: dropShadowFilter,
          pointerEvents: imgPointerEvents
        }}
        draggable={false}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = 'https://i.imgur.com/80idhS4.png';
          target.alt = 'Error loading image';
        }}
      />
    </div>
  );
};