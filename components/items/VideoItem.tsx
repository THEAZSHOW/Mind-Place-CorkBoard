
import React from 'react';
import { BoardItemData } from '../../types';

interface VideoItemProps {
  item: BoardItemData;
  isDragging: boolean;
  iframeEnabled: boolean;
}

const getYouTubeEmbedUrl = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  // FIX: Add a stricter check for `match` and `match[2]` to prevent a TypeError on `.length` if the regex result is unexpected.
  return (match && match[2] && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

export const VideoItem: React.FC<VideoItemProps> = ({ item, isDragging, iframeEnabled }) => {
  const embedUrl = getYouTubeEmbedUrl(item.content);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center text-white relative">
      {embedUrl ? (
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title="YouTube"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ pointerEvents: (iframeEnabled && !isDragging) ? 'auto' : 'none' }}
        />
      ) : (
        <p className="p-4 text-center text-red-400">Invalid YouTube URL</p>
      )}
      <div
        className="absolute top-0 left-0 right-0 h-8 bg-white/10 backdrop-blur-sm text-xs flex items-center justify-center select-none"
        style={{ cursor: 'move' }}
        data-drag-handle="true"
      >
        drag here
      </div>
    </div>
  );
};
