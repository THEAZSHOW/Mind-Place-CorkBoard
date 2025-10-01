
export enum ItemType {
  Note = 'NOTE',
  Image = 'IMAGE',
  Video = 'VIDEO',
  Emoji = 'EMOJI',
  Shape = 'SHAPE'
}

// FIX: Add LinkPreviewData interface for link items, as it was missing.
export interface LinkPreviewData {
  title: string;
  description: string;
  image: string;
  url: string;
}

export interface BoardItemData {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  shapeType?: 'arrow' | 'circle' | 'box';
  hasPin?: boolean;
  // FIX: Add optional previewData property for link items.
  previewData?: LinkPreviewData;

  // New properties for shape styling
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed';
  fillColor?: string; // e.g., '#RRGGBB' or 'transparent'
  opacity?: number; // 0 to 1
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface BoardState {
  items: BoardItemData[];
  connections: Connection[];
}

export interface FontChoice {
  label: string;
  value: string;
}

export interface Board {
  id:string;
  name: string;
}