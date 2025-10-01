import React from 'react';

interface ContextMenuProps {
  position: { top: number; left: number };
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

const CtxBtn: React.FC<{
  onClick?: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    onPointerDown={(e) => e.stopPropagation()} // Prevent board pan
    title={title}
    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-lg transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
  >
    {children}
  </button>
);

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onDelete,
  onBringForward,
  onSendBackward,
}) => {
  React.useEffect(() => {
    window.lucide?.createIcons();
  }, []);

  return (
    <div
      className="context-menu"
      style={{ top: position.top, left: position.left }}
      onPointerDown={(e) => e.stopPropagation()} // Prevent board pan on menu itself
    >
      <div className="flex items-center gap-1">
        <CtxBtn onClick={onDelete} title="Delete Selected">
          <i data-lucide="trash-2" className="w-5 h-5"></i>
        </CtxBtn>
        <CtxBtn onClick={onBringForward} title="Bring Forward">
          <i data-lucide="arrow-up" className="w-5 h-5 text-white"></i>
        </CtxBtn>
        <CtxBtn onClick={onSendBackward} title="Send Backward">
          <i data-lucide="arrow-down" className="w-5 h-5 text-white"></i>
        </CtxBtn>
      </div>
    </div>
  );
};
