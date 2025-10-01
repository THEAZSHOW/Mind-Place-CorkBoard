
import React from 'react';
import { BoardItemData } from '../../types';

interface EmojiItemProps {
  item: BoardItemData;
}

export const EmojiItem: React.FC<EmojiItemProps> = ({ item }) => (
  <div className="w-full h-full flex items-center justify-center bg-transparent">
    <span
      style={{
        fontSize: Math.min(item.width, item.height) * 0.8,
        textShadow: '0 5px 15px rgba(0,0,0,0.25)'
      }}
      className="select-none"
    >
      {item.content}
    </span>
  </div>
);
