import React, { useState, useEffect } from 'react';
import { ItemType } from '../types';
import { FONT_CHOICES, ZOOM_MIN, ZOOM_MAX } from '../constants';

interface ToolbarProps {
  onAddItem: (type: ItemType) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onThemeChange: () => void;
  onBackup: () => void;
  onLoad: () => void;
  boardName: string;
  currentFont: string;
  onFontChange: (font: string) => void;
  shadowDepth: number;
  onShadowChange: (depth: number) => void;
  stringThickness: number;
  onStringThicknessChange: (thickness: number) => void;
  stringTension: number;
  onStringTensionChange: (tension: number) => void;
  onResetBoard: () => void;
  onToggleAreaSelection: () => void;
  isAreaSelectionMode: boolean;
  activeShapeTool: 'arrow' | 'circle' | 'box' | null;
  onSelectShapeTool: (shape: 'arrow' | 'circle' | 'box' | null) => void;
  onToggleStyleMenu: () => void;
  isStyleMenuOpen: boolean;
  onShowHelp: () => void;
}

const TBBtn: React.FC<{
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, disabled = false, isActive = false, children }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`TBBtn w-10 h-10 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-lg transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${isActive ? 'bg-blue-500 text-white' : ''}`}
  >
    {children}
  </button>
);

const Sep: React.FC = () => <div className="toolbar-separator w-px h-6 bg-black/20 mx-1"></div>;

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddItem, zoomLevel, onZoomChange, onUndo, onRedo, canUndo, canRedo,
  onThemeChange, onBackup, onLoad, currentFont, onFontChange,
  shadowDepth, onShadowChange, stringThickness, onStringThicknessChange,
  stringTension, onStringTensionChange,
  onResetBoard, onToggleAreaSelection, isAreaSelectionMode,
  activeShapeTool, onSelectShapeTool,
  onToggleStyleMenu, isStyleMenuOpen, onShowHelp
}) => {
  const [showShapeChoices, setShowShapeChoices] = useState(false);

  useEffect(() => {
    // This ensures that when new icons are added to the DOM (like the shape choices),
    // the Lucide script is re-run to convert the <i> tags into SVG icons.
    window.lucide?.createIcons();
  }, [showShapeChoices, isStyleMenuOpen]); // Re-run whenever visibility changes.

  const handleShapeButtonClick = () => {
    setShowShapeChoices(prev => !prev);
    if (activeShapeTool) {
        onSelectShapeTool(null);
    }
  };

  const handleSelectShape = (shape: 'arrow' | 'circle' | 'box') => {
    if (activeShapeTool === shape) {
      onSelectShapeTool(null);
      setShowShapeChoices(false);
    } else {
      onSelectShapeTool(shape);
      setShowShapeChoices(false);
    }
  };


  return (
    <div className="main-toolbar absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-neutral-100/80 backdrop-blur-lg p-2 rounded-2xl shadow-lg text-neutral-800 max-w-[95vw] border border-white/30">
        <div className="flex flex-wrap justify-center items-center gap-1">
          <TBBtn onClick={() => onAddItem(ItemType.Note)} title="Add Sticky Note"><i data-lucide="sticky-note" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={() => onAddItem(ItemType.Image)} title="Upload Image"><i data-lucide="image" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={() => onAddItem(ItemType.Video)} title="Add YouTube Video"><i data-lucide="youtube" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={() => onAddItem(ItemType.Emoji)} title="Add Emoji"><i data-lucide="smile" className="w-5 h-5"></i></TBBtn>
          <Sep />
          <TBBtn onClick={handleShapeButtonClick} title="Shape Tools" isActive={showShapeChoices || !!activeShapeTool}><i data-lucide="shapes" className="w-5 h-5"></i></TBBtn>
          {showShapeChoices && (
             <>
                <TBBtn onClick={() => handleSelectShape('box')} title="Box" isActive={activeShapeTool === 'box'}><i data-lucide="square" className="w-5 h-5"></i></TBBtn>
                <TBBtn onClick={() => handleSelectShape('circle')} title="Circle" isActive={activeShapeTool === 'circle'}><i data-lucide="circle" className="w-5 h-5"></i></TBBtn>
                <TBBtn onClick={() => handleSelectShape('arrow')} title="Arrow" isActive={activeShapeTool === 'arrow'}><i data-lucide="move-right" className="w-5 h-5"></i></TBBtn>
             </>
          )}
          <TBBtn onClick={onToggleAreaSelection} title="Area Selection Tool" isActive={isAreaSelectionMode}><i data-lucide="scan" className="w-5 h-5"></i></TBBtn>
          <Sep />
          <TBBtn onClick={onResetBoard} title="Reset Board"><i data-lucide="trash-2" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}><i data-lucide="undo-2" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}><i data-lucide="redo-2" className="w-5 h-5"></i></TBBtn>
          <Sep />
          <TBBtn onClick={onToggleStyleMenu} title="Style Options" isActive={isStyleMenuOpen}><i data-lucide="sliders-horizontal" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={onThemeChange} title="Change Theme"><i data-lucide="palette" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={onBackup} title="Save"><i data-lucide="save" className="w-5 h-5"></i></TBBtn>
          <TBBtn onClick={onLoad} title="Load Board"><i data-lucide="folder-open" className="w-5 h-5"></i></TBBtn>
          <Sep />
          <TBBtn onClick={onShowHelp} title="Help"><i data-lucide="help-circle" className="w-5 h-5"></i></TBBtn>
          
          {isStyleMenuOpen && (
            <div className="flex items-center gap-3 flex-wrap justify-center ml-2">
                <div className="flex items-center gap-1 bg-black/5 p-1 rounded-full">
                    <select
                    value={currentFont}
                    onChange={(e) => onFontChange(e.target.value)}
                    className="text-xs px-2 py-1 rounded-full text-black bg-white/80 border-none appearance-none focus:outline-none"
                    title="Font for notes"
                    >
                    {FONT_CHOICES.map(f => (
                        <option key={f.label} value={f.value}>{f.label}</option>
                    ))}
                    </select>
                </div>
                <div className="style-control-group flex items-center gap-2 bg-black/5 p-1 rounded-full px-3">
                    <label className="style-menu-label text-xs text-neutral-600">Shadow</label>
                    <input
                    type="range" min="0" max="60" step="1" value={shadowDepth}
                    onChange={(e) => onShadowChange(parseInt(e.target.value))}
                    className="w-24"
                    />
                </div>
                <div className="style-control-group flex items-center gap-2 bg-black/5 p-1 rounded-full px-3">
                    <label className="style-menu-label text-xs text-neutral-600">String</label>
                    <input
                    type="range" min="1" max="40" step="1" value={stringThickness}
                    onChange={(e) => onStringThicknessChange(parseInt(e.target.value))}
                    className="w-24"
                    />
                </div>
                <div className="style-control-group flex items-center gap-2 bg-black/5 p-1 rounded-full px-3">
                    <label className="style-menu-label text-xs text-neutral-600">Tension</label>
                    <input
                    type="range" min="1" max="100" step="1" value={stringTension}
                    onChange={(e) => onStringTensionChange(parseInt(e.target.value))}
                    className="w-24"
                    />
                </div>
            </div>
          )}
        </div>
    </div>
  );
};