import React from 'react';

export interface ShapeStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
}

interface ShapeStyleToolbarProps {
  style: ShapeStyle;
  onStyleChange: (updates: Partial<ShapeStyle>) => void;
}

const STROKE_COLORS = ['#374151', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7'];
const FILL_COLORS = ['transparent', '#d1d5db', '#fecaca', '#bfdbfe', '#bbf7d0', '#fed7aa', '#e9d5ff'];
const STROKE_WIDTHS = [{label: 'S', value: 2}, {label: 'M', value: 4}, {label: 'L', value: 8}];

const ColorSwatch: React.FC<{
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ color, isSelected, onClick }) => {
    const isTransparent = color === 'transparent';
    return (
        <button
            onClick={onClick}
            className={`w-6 h-6 rounded-full border border-gray-300 transition-transform transform hover:scale-110 ${isSelected ? 'color-swatch-selected' : ''} ${isTransparent ? 'transparent-swatch' : ''}`}
            style={{ backgroundColor: isTransparent ? undefined : color }}
            title={isTransparent ? 'Transparent' : color}
        />
    );
};

const ToolbarSection: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
    <div className="flex items-center gap-2">
        <span className="text-xs text-white/80 w-12 text-right">{label}</span>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);


export const ShapeStyleToolbar: React.FC<ShapeStyleToolbarProps> = ({ style, onStyleChange }) => {
  return (
    <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 bg-black/30 backdrop-blur-md p-2 rounded-xl shadow-lg text-white flex flex-col items-start gap-2">
        <ToolbarSection label="Stroke">
            {STROKE_COLORS.map(c => (
                <ColorSwatch key={c} color={c} isSelected={style.strokeColor === c} onClick={() => onStyleChange({ strokeColor: c })} />
            ))}
        </ToolbarSection>
        <ToolbarSection label="Fill">
            {FILL_COLORS.map(c => (
                <ColorSwatch key={c} color={c} isSelected={style.fillColor === c} onClick={() => onStyleChange({ fillColor: c })} />
            ))}
        </ToolbarSection>
        <div className="flex items-center gap-3 w-full">
            <ToolbarSection label="Width">
                {STROKE_WIDTHS.map(({label, value}) => (
                    <button
                        key={value}
                        onClick={() => onStyleChange({ strokeWidth: value })}
                        className={`w-7 h-7 flex items-center justify-center text-xs rounded-full transition-colors ${style.strokeWidth === value ? 'bg-blue-500 text-white' : 'bg-white/20 hover:bg-white/40'}`}
                    >
                        {label}
                    </button>
                ))}
            </ToolbarSection>
            <div className="w-px h-6 bg-white/20 mx-1"></div>
            <ToolbarSection label="Opacity">
                 <input
                  type="range" min="0.1" max="1" step="0.1" value={style.opacity}
                  onChange={(e) => onStyleChange({ opacity: parseFloat(e.target.value) })}
                  className="w-24"
                />
            </ToolbarSection>
        </div>
    </div>
  );
};