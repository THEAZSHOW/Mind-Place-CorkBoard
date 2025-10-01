
import React, { useEffect } from 'react';
import { BoardItemData } from '../../types';
import { FONT_CHOICES, FONT_SIZE_DEFAULT, FONT_SIZE_MIN, NOTE_PLACEHOLDER } from '../../constants';

interface StickyNoteProps {
  item: BoardItemData;
  onUpdate: (id: string, updates: Partial<BoardItemData>) => void;
  isSelected: boolean;
  currentFontFamily: string;
  isEditing: boolean;
  onSetEditing: (isEditing: boolean) => void;
}

const FontSizeButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-full text-sm font-bold text-gray-700"
    onPointerDown={e => e.stopPropagation()}
  >
    {children}
  </button>
);

export const StickyNote: React.FC<StickyNoteProps> = ({ item, onUpdate, isSelected, currentFontFamily, isEditing, onSetEditing }) => {
  const fs = item.fontSize || FONT_SIZE_DEFAULT;
  const fontFamily = item.fontFamily || currentFontFamily || FONT_CHOICES[0].value;

  useEffect(() => {
    // When the item becomes editable, if its content is the default placeholder, clear it.
    if (isEditing && item.content === NOTE_PLACEHOLDER) {
      onUpdate(item.id, { content: '' });
    }
  }, [isEditing, item.content, item.id, onUpdate]);

  const changeFontSize = (dir: 'increase' | 'decrease') => {
    const newSize = dir === 'increase' ? fs + 4 : Math.max(FONT_SIZE_MIN, fs - 4);
    onUpdate(item.id, { fontSize: newSize });
  };

  return (
    <div className={`w-full h-full p-6 pt-12 relative ${item.color || 'bg-yellow-200'}`}>
      {isSelected && (
        <div className="absolute top-4 right-4 flex space-x-2 z-20">
          <FontSizeButton onClick={() => changeFontSize('decrease')}>A-</FontSizeButton>
          <FontSizeButton onClick={() => changeFontSize('increase')}>A+</FontSizeButton>
        </div>
      )}
      {isEditing ? (
        <textarea
          className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-gray-800"
          style={{ fontSize: `${fs}px`, lineHeight: 1.5, fontFamily }}
          value={item.content}
          onChange={(e) => onUpdate(item.id, { content: e.target.value })}
          placeholder="Write something..."
          autoFocus
          onBlur={() => onSetEditing(false)}
        />
      ) : (
        <div
          className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-gray-800 whitespace-pre-wrap break-words"
          style={{ fontSize: `${fs}px`, lineHeight: 1.5, fontFamily }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onSetEditing(true);
          }}
        >
          {item.content || <span className="text-gray-400">Double-click to edit</span>}
        </div>
      )}
    </div>
  );
};