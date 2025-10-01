import React, { useEffect, useRef } from 'react';

// The browser.js script from the CDN exposes an EmojiMart global object.
declare const EmojiMart: any;

interface Emoji {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
  skin?: number;
}

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: Emoji) => void;
}

export const EmojiPickerWrapper: React.FC<EmojiPickerProps> = ({ isOpen, onClose, onEmojiSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerInitialized = useRef(false);

  // Use refs for callbacks to ensure the effect always has the latest functions
  const onCloseRef = useRef(onClose);
  const onEmojiSelectRef = useRef(onEmojiSelect);
  useEffect(() => {
    onCloseRef.current = onClose;
    onEmojiSelectRef.current = onEmojiSelect;
  }, [onClose, onEmojiSelect]);

  useEffect(() => {
    // Only proceed if the picker is open and has not been initialized yet.
    // This is a "lazy, one-time initialization" pattern.
    if (isOpen && !pickerInitialized.current) {
      const container = containerRef.current;
      if (!container) return;

      // Create the picker instance ONLY ONCE.
      const picker = new EmojiMart.Picker({
        onEmojiSelect: (emoji: Emoji) => onEmojiSelectRef.current(emoji),
        // We handle closing manually via the backdrop click to avoid library conflicts.
      });

      container.appendChild(picker as unknown as HTMLElement);
      pickerInitialized.current = true; // Mark as initialized.
    }
  }, [isOpen]); // Effect runs when isOpen changes, but logic inside only runs once.

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click is on the backdrop itself (not the picker), close it.
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-[1000] pt-24"
      style={{ display: isOpen ? 'flex' : 'none' }} // Control visibility with CSS
      onClick={handleBackdropClick} // Use a standard React event for closing
    >
      <div ref={containerRef} />
    </div>
  );
};
