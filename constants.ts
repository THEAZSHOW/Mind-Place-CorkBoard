import { BoardItemData, FontChoice } from './types';

export const PIN_URL = 'https://i.ibb.co/cPJm1cG/image-from-rawpixel-id-8314917-png.png';
export const ZOOM_MIN = 0.005;
export const ZOOM_MAX = 10;
export const ZOOM_SENSITIVITY = 0.0002;
export const SNAP_THRESHOLD = 10; // In screen pixels
export const GRID_SIZE = 20; // In board units

export const PIN_OFFSET_Y = 30; // Vertical offset for the pin tip from the item's top edge.

export const NOTE_COLORS: string[] = [
  'bg-orange-200', 'bg-teal-200', 'bg-indigo-200', 'bg-yellow-200',
  'bg-pink-200', 'bg-purple-200', 'bg-green-200', 'bg-blue-200',
  'bg-blue-300', 'bg-red-200', 'bg-cyan-200', 'bg-lime-200',
  'bg-emerald-200', 'bg-gray-200'
];

export const INITIAL_Z_INDEX = 10;
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_DEFAULT = 32;

export const NOTE_PLACEHOLDER = 'Write something...';

export const FONT_CHOICES: FontChoice[] = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Patrick Hand', value: "'Patrick Hand', cursive" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', 'Comic Sans', cursive" },
];

export const getConnectorEndpoint = (item: BoardItemData) => {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;

  if (item.hasPin) {
    // Calculate the pin's position relative to the item's center when rotation is 0
    const pinRelY = PIN_OFFSET_Y - (item.height / 2);
    
    // Get the rotation in radians
    const rad = (item.rotation || 0) * Math.PI / 180;
    const sinRad = Math.sin(rad);
    const cosRad = Math.cos(rad);

    // Rotate the relative Y position (relative X is 0) around the origin
    const rotatedX = -pinRelY * sinRad;
    const rotatedY = pinRelY * cosRad;

    // Add the rotated relative coordinates to the item's center to get the final world position
    const finalX = cx + rotatedX;
    const finalY = cy + rotatedY;
    
    return { x: finalX, y: finalY };
  }

  return { x: cx, y: cy };
};
