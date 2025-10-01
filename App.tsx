import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BoardItemData, ItemType, BoardState, Board, Connection } from './types';
import { FONT_CHOICES, INITIAL_Z_INDEX, NOTE_COLORS, FONT_SIZE_DEFAULT, NOTE_PLACEHOLDER, getConnectorEndpoint } from './constants';
import { usePersistentHistory } from './hooks/usePersistentHistory';
import { useBoardInteraction } from './hooks/useBoardInteraction';
import { Toolbar } from './components/Toolbar';
import { BoardItem } from './components/BoardItem';
import { Connector } from './components/Connector';
import { InputDialog } from './components/dialogs/InputDialog';
import { ConfirmationDialog } from './components/dialogs/ConfirmationDialog';
import { EmojiPickerWrapper } from './components/dialogs/EmojiPickerWrapper';
import { WelcomeGuide } from './components/WelcomeGuide';
import { ContextMenu } from './components/ContextMenu';
import { ShapeStyleToolbar, ShapeStyle } from './components/ShapeStyleToolbar';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';


// Fix: Add type definitions for File System Access API to support window.showSaveFilePicker
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

declare global {
  interface Window {
    showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    lucide: {
      createIcons: () => void;
    };
  }
}

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.warn(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

const App: React.FC = () => {
  const board: Board = { id: 'default-board', name: 'My Corkboard' };
  const { state, setState, undo, redo, canUndo, canRedo } = usePersistentHistory<BoardState>(
    `corkboard-${board.id}`, { items: [], connections: [] }
  );
  const { items, connections } = state;
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  // FIX: Use separate z-index counters for shapes, arrows, and other items to enforce layering.
  const [zIndexCounter, setZIndexCounter] = useState(() => {
    const arrowItems = items.filter(i => i.shapeType === 'arrow');
    const shapeItems = items.filter(i => i.type === ItemType.Shape && i.shapeType !== 'arrow');
    const otherItems = items.filter(i => i.type !== ItemType.Shape);
    return {
      arrow: arrowItems.length > 0 ? Math.max(50000, ...arrowItems.map(i => i.zIndex)) : 50000,
      shape: shapeItems.length > 0 ? Math.max(0, ...shapeItems.map(i => i.zIndex)) : 0,
      item: otherItems.length > 0 ? Math.max(INITIAL_Z_INDEX, ...otherItems.map(i => i.zIndex)) : INITIAL_Z_INDEX
    };
  });
  const [theme, setTheme] = useLocalStorage('corkboard-theme', 'white');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [transientUpdates, setTransientUpdates] = useState<Record<string, Partial<BoardItemData>>>({});
  const [dialogState, setDialogState] = useState({ isOpen: false, type: null as ItemType | null, title: '', placeholder: '', defaultValue: '' });
  const [confirmationState, setConfirmationState] = useState({ isOpen: false, title: '', message: '', onConfirm: null as (() => void) | null });
  const [currentFontFamily, setCurrentFontFamily] = useLocalStorage('corkboard-font', FONT_CHOICES[0].value);
  const [shadowDepth, setShadowDepth] = useLocalStorage('corkboard-shadow-depth', 10);
  const [stringThickness, setStringThickness] = useLocalStorage('corkboard-string-thickness', 3);
  const [stringTension, setStringTension] = useLocalStorage('corkboard-string-tension', 50);
  const [isAreaSelectionMode, setIsAreaSelectionMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<BoardItemData[]>([]);
  const [newItemIds, setNewItemIds] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('corkboard-welcome-seen'));
  const [activeShapeTool, setActiveShapeTool] = useState<'arrow' | 'circle' | 'box' | null>(null);
  const [drawingShape, setDrawingShape] = useState<BoardItemData | null>(null);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{top: number, left: number} | null>(null);
  const [drawingConnection, setDrawingConnection] = useState<{ fromId: string; toCoords: { x: number; y: number } } | null>(null);
  const [shapeStyle, setShapeStyle] = useState<ShapeStyle>({
    strokeColor: '#374151',
    strokeWidth: 4,
    fillColor: 'transparent',
    opacity: 1,
  });
  const drawingStartPoint = useRef<{ x: number; y: number } | null>(null);
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const { pan, zoom, setZoom } = useBoardInteraction(boardViewportRef, isAreaSelectionMode, !!activeShapeTool || !!drawingConnection);
  const shiftPressed = useRef(false);

  useEffect(() => {
    window.lucide?.createIcons();
  }, [isStyleMenuOpen, activeShapeTool, selectedItemIds]);

  useEffect(() => {
    if (newItemIds.length > 0) {
      const timer = setTimeout(() => setNewItemIds([]), 300);
      return () => clearTimeout(timer);
    }
  }, [newItemIds]);

  const startAreaSelection = (e: React.PointerEvent) => {
    if (!isAreaSelectionMode || !boardViewportRef.current) return;
    const rect = boardViewportRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
  };
  const updateAreaSelection = (e: React.PointerEvent) => {
    if (!selectionBox || !isAreaSelectionMode || !boardViewportRef.current) return;
    const rect = boardViewportRef.current.getBoundingClientRect();
    setSelectionBox(prev => prev && ({ ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top }));
  };
  const endAreaSelection = () => {
    if (!selectionBox || !isAreaSelectionMode) return;
    const { startX, startY, endX, endY } = selectionBox;
    const left = (Math.min(startX, endX) - pan.x) / zoom;
    const top = (Math.min(startY, endY) - pan.y) / zoom;
    const right = (Math.max(startX, endX) - pan.x) / zoom;
    const bottom = (Math.max(startY, endY) - pan.y) / zoom;
    const selected = items.filter(item => {
      const itemRect = {
        left: item.x,
        top: item.y,
        right: item.x + item.width,
        bottom: item.y + item.height
      };
      return itemRect.left < right && itemRect.right > left && itemRect.top < bottom && itemRect.bottom > top;
    });
    if (selected.length > 0) setSelectedItemIds(selected.map(item => item.id));
    setSelectionBox(null);
    setIsAreaSelectionMode(false);
  };
  
  const handleUpdateItems = useCallback((itemUpdates: Array<{ id: string; updates: Partial<BoardItemData> }>) => {
      const updateMap = new Map(itemUpdates.map(u => [u.id, u.updates]));
      setState(prev => ({
          ...prev,
          items: prev.items.map(it => updateMap.has(it.id) ? { ...it, ...updateMap.get(it.id) } : it)
      }));
  }, [setState]);

  const handleUpdateItem = useCallback((id: string, updates: Partial<BoardItemData>) => {
      handleUpdateItems([{ id, updates }]);
  }, [handleUpdateItems]);

  const getCenterPosition = useCallback(() => {
    if (!boardViewportRef.current) return { x: 2500, y: 2500 };
    const rect = boardViewportRef.current.getBoundingClientRect();
    return { x: (rect.width / 2 - pan.x) / zoom, y: (rect.height / 2 - pan.y) / zoom };
  }, [pan, zoom]);

  const addNewItem = useCallback((type: ItemType, content: string, extra: Partial<BoardItemData> = {}) => {
    const center = getCenterPosition();
    const isArrow = extra.shapeType === 'arrow';
    const isShape = type === ItemType.Shape && !isArrow;
    let newZ: number;
    if (isArrow) newZ = zIndexCounter.arrow + 1;
    else if (isShape) newZ = zIndexCounter.shape + 1;
    else newZ = zIndexCounter.item + 1;
    const defaultHasPin = type === ItemType.Note;
    const base: BoardItemData = {
      id: `item-${Date.now()}`, type, x: center.x - 125, y: center.y - 125, width: 250, height: 250,
      rotation: 0, zIndex: newZ, content, color: type === ItemType.Note ? NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)] : undefined,
      fontSize: type === ItemType.Note ? FONT_SIZE_DEFAULT : undefined, fontFamily: type === ItemType.Note ? currentFontFamily : undefined,
      hasPin: extra.hasPin ?? defaultHasPin,
      ...extra
    };
    setState(prev => ({ ...prev, items: [...prev.items, base] }));
    setZIndexCounter(prev => {
      if (isArrow) return { ...prev, arrow: newZ };
      if (isShape) return { ...prev, shape: newZ };
      return { ...prev, item: newZ };
    });
    setSelectedItemIds([base.id]);
    setNewItemIds([base.id]);
    return base;
  }, [getCenterPosition, zIndexCounter, currentFontFamily, setState]);

  // FIX: Use a direct, memoized callback for emoji selection for reliability.
  const handleEmojiSelect = useCallback((emoji: { native: string }) => {
    if (emoji && emoji.native) {
      addNewItem(ItemType.Emoji, emoji.native, { width: 150, height: 150 });
      setIsEmojiPickerOpen(false);
    }
  }, [addNewItem]);

  const closeEmojiPicker = useCallback(() => setIsEmojiPickerOpen(false), []);

  const handleZIndex = (itemId: string, dir: 'forward' | 'backward') => {
    const itemToMove = items.find(i => i.id === itemId);
    if (!itemToMove) return;
    const isArrow = itemToMove.shapeType === 'arrow';
    const isShape = itemToMove.type === ItemType.Shape && !isArrow;

    if (dir === 'forward') {
      let newZ: number;
      if (isArrow) newZ = zIndexCounter.arrow + 1;
      else if (isShape) newZ = zIndexCounter.shape + 1;
      else newZ = zIndexCounter.item + 1;

      handleUpdateItem(itemId, { zIndex: newZ });
      setZIndexCounter(prev => {
        if (isArrow) return { ...prev, arrow: newZ };
        if (isShape) return { ...prev, shape: newZ };
        return { ...prev, item: newZ };
      });
      return;
    }
    
    // For 'backward', find the correct group to sort
    const sortedGroup = items
      .filter(i => {
        const iIsArrow = i.shapeType === 'arrow';
        const iIsShape = i.type === ItemType.Shape && !iIsArrow;
        // This logic ensures an item is only compared with others in its own layer
        return (iIsArrow === isArrow) && (iIsShape === isShape) && (!iIsArrow && !iIsShape) === (!isArrow && !isShape);
      })
      .sort((a, b) => a.zIndex - b.zIndex);
    
    const currentIndex = sortedGroup.findIndex(i => i.id === itemId);
    
    if (dir === 'backward' && currentIndex > 0) {
      const itemBelow = sortedGroup[currentIndex - 1];
      // Swap z-indexes
      handleUpdateItem(itemId, { zIndex: itemBelow.zIndex });
      handleUpdateItem(itemBelow.id, { zIndex: itemToMove.zIndex });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftPressed.current = true;
      
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'Escape') {
        setSelectedItemIds([]);
        if (isAreaSelectionMode) setIsAreaSelectionMode(false);
        if (activeShapeTool) setActiveShapeTool(null);
        if (isStyleMenuOpen) setIsStyleMenuOpen(false);
        setEditingItemId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const itemsToCopy = items.filter(item => selectedItemIds.includes(item.id));
        setCopiedItems(itemsToCopy);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedItems.length > 0) {
        const center = getCenterPosition();
        let newShapeZ = zIndexCounter.shape;
        let newItemZ = zIndexCounter.item;
        let newArrowZ = zIndexCounter.arrow;
        const newItems = copiedItems.map(item => {
          const isArrow = item.shapeType === 'arrow';
          const isShape = item.type === ItemType.Shape && !isArrow;
          let newZ: number;
          if (isArrow) newZ = ++newArrowZ;
          else if (isShape) newZ = ++newShapeZ;
          else newZ = ++newItemZ;
          return { ...item, id: `item-${Date.now()}-${Math.random()}`, x: center.x - item.width / 2 + 20, y: center.y - item.height / 2 + 20, zIndex: newZ };
        });
        setState(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
        setZIndexCounter({ shape: newShapeZ, item: newItemZ, arrow: newArrowZ });
        setNewItemIds(newItems.map(item => item.id));
        setSelectedItemIds(newItems.map(item => item.id));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') e.shiftKey ? redo() : undo();
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemIds.length > 0) {
        setState(prev => ({
          ...prev,
          items: prev.items.filter(it => !selectedItemIds.includes(it.id)),
          connections: prev.connections.filter(c => !selectedItemIds.includes(c.fromId) && !selectedItemIds.includes(c.toId))
        }));
        setSelectedItemIds([]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftPressed.current = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, setState, selectedItemIds, items, zIndexCounter, copiedItems, isAreaSelectionMode, activeShapeTool, isStyleMenuOpen, getCenterPosition]);

  useEffect(() => {
    if (selectedItemIds.length > 0 && boardViewportRef.current) {
        const selectedItems = items.filter(item => selectedItemIds.includes(item.id));
        const topMostItem = selectedItems.reduce((top, current) => (current.y < top.y) ? current : top, selectedItems[0]);
        if (topMostItem) {
            const screenX = (topMostItem.x + topMostItem.width / 2) * zoom + pan.x;
            const screenY = topMostItem.y * zoom + pan.y;
            setContextMenuPosition({ top: screenY, left: screenX });
        }
    } else {
        setContextMenuPosition(null);
    }
  }, [selectedItemIds, items, pan, zoom]);

  const handleAddItem = (type: ItemType) => {
    if (type === ItemType.Note) {
      const note = addNewItem(ItemType.Note, NOTE_PLACEHOLDER);
      setEditingItemId(note.id);
    }
    else if (type === ItemType.Image) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const MAX_DIMENSION = 1280;
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          const { width, height } = img;
          let newWidth = width;
          let newHeight = height;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              newWidth = MAX_DIMENSION;
              newHeight = (height * MAX_DIMENSION) / width;
            } else {
              newHeight = MAX_DIMENSION;
              newWidth = (width * MAX_DIMENSION) / height;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Preserve transparency for PNGs, use JPEG for others for better compression.
            const isPng = file.type === 'image/png';
            const resizedDataUrl = isPng 
              ? canvas.toDataURL('image/png') 
              : canvas.toDataURL('image/jpeg', 0.9);
            
            // By default, add images with a pin and frame. This matches user expectations
            // for a "corkboard" and ensures consistency.
            addNewItem(ItemType.Image, resizedDataUrl, { width: 400, height: 300, hasPin: true });
          }
          
          URL.revokeObjectURL(objectUrl); // IMPORTANT: Clean up memory
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          alert('Could not load the selected image file.');
        };

        img.src = objectUrl;
      };
      input.click();
    } else if (type === ItemType.Video) setDialogState({ isOpen: true, type, title: 'Add YouTube Video', placeholder: 'https://www.youtube.com/watch?v=...', defaultValue: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    else if (type === ItemType.Emoji) setIsEmojiPickerOpen(true);
  };
  
  const handleDialogSubmit = (value: string) => {
    if (dialogState.type === ItemType.Video) addNewItem(ItemType.Video, value, { width: 480, height: 270 });
    setDialogState({ isOpen: false, type: null, title: '', placeholder: '', defaultValue: '' });
  };

  const handleSelectItem = useCallback((id: string, shift: boolean) => {
    setEditingItemId(null);
    setSelectedItemIds(prev => shift ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : (prev.length === 1 && prev[0] === id ? prev : [id]));
  }, []);
  
  const handleResetBoard = () => setConfirmationState({ 
      isOpen: true, 
      title: 'Reset Corkboard', 
      message: 'Are you sure? This will remove all items and cannot be undone.', 
      onConfirm: () => { 
        setState({ items: [], connections: [] }); 
        setSelectedItemIds([]); 
        setZIndexCounter({ shape: 0, item: INITIAL_Z_INDEX, arrow: 50000 }); 
        setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: null }); 
      } 
  });
  
  const THEMES = ['white', 'dark', 'orange'];
  const handleThemeChange = () => {
    const currentIndex = THEMES.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
  };
  
  const handleBackup = async () => {
    const data = JSON.stringify({ name: board.name, ...state }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const filename = `${board.name.replace(/\s+/g, '_')}_backup.json`;
  
    const fallbackSave = () => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    };
  
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Corkboard JSON', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        // Silently fail and use fallback. The browser may still log an error, but we won't.
        fallbackSave();
      }
    } else {
      fallbackSave();
    }
  };
  
  const handleLoadBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = re => {
        try {
          const data = JSON.parse(re.target?.result as string);
          if (data && Array.isArray(data.items)) {
            setState({ items: data.items, connections: data.connections || [] });
            // Recalculate z-index counters from loaded data
            const arrowItems = data.items.filter((i: BoardItemData) => i.shapeType === 'arrow');
            const shapeItems = data.items.filter((i: BoardItemData) => i.type === ItemType.Shape && i.shapeType !== 'arrow');
            const otherItems = data.items.filter((i: BoardItemData) => i.type !== ItemType.Shape);
            setZIndexCounter({
              arrow: arrowItems.length > 0 ? Math.max(50000, ...arrowItems.map((i: BoardItemData) => i.zIndex)) : 50000,
              shape: shapeItems.length > 0 ? Math.max(0, ...shapeItems.map((i: BoardItemData) => i.zIndex)) : 0,
              item: otherItems.length > 0 ? Math.max(INITIAL_Z_INDEX, ...otherItems.map((i: BoardItemData) => i.zIndex)) : INITIAL_Z_INDEX
            });
          } else { alert('Invalid backup file.'); }
        } catch { alert('Failed to parse.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  
  const handleDeleteSelectedItems = () => {
    if (selectedItemIds.length > 0) {
        setState(prev => ({
            ...prev,
            items: prev.items.filter(it => !selectedItemIds.includes(it.id)),
            connections: prev.connections.filter(c => !selectedItemIds.includes(c.fromId) && !selectedItemIds.includes(c.toId))
        }));
        setSelectedItemIds([]);
    }
  };

  const handleBringSelectedForward = () => {
      selectedItemIds.forEach(id => handleZIndex(id, 'forward'));
  };

  const handleSendSelectedBackward = () => {
      const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
      selectedItems
          .sort((a, b) => a.zIndex - b.zIndex)
          .forEach(item => handleZIndex(item.id, 'backward'));
  };

  const handleConnectItems = () => {
    if (selectedItemIds.length < 2) return;
    setState(prev => {
      const newConnections: Connection[] = [];
      const itemsToUpdate = new Map<string, Partial<BoardItemData>>();
      for (let i = 0; i < selectedItemIds.length - 1; i++) {
        const fromId = selectedItemIds[i], toId = selectedItemIds[i + 1];
        const isConnected = prev.connections.some(c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId));
        if (!isConnected) {
          newConnections.push({ id: `conn-${fromId}-${toId}-${Date.now()}`, fromId, toId });
          [fromId, toId].forEach(id => {
            const item = prev.items.find(i => i.id === id);
            if (item && !item.hasPin) {
              itemsToUpdate.set(id, { hasPin: true });
            }
          });
        }
      }
      if (newConnections.length === 0 && itemsToUpdate.size === 0) return prev;
      const updatedItems = itemsToUpdate.size > 0
        ? prev.items.map(item => itemsToUpdate.has(item.id) ? { ...item, ...itemsToUpdate.get(item.id)! } : item)
        : prev.items;
      return { items: updatedItems, connections: [...prev.connections, ...newConnections] };
    });
  };

  const handleDisconnectItems = () => {
    if (selectedItemIds.length < 2) return;
    setState(prev => {
      const connectionsToRemove = new Set<string>();
      for (let i = 0; i < selectedItemIds.length - 1; i++) {
        const fromId = selectedItemIds[i], toId = selectedItemIds[i + 1];
        const connection = prev.connections.find(c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId));
        if (connection) connectionsToRemove.add(connection.id);
      }
      if (connectionsToRemove.size === 0) return prev;
      return { ...prev, connections: prev.connections.filter(c => !connectionsToRemove.has(c.id)) };
    });
  };
  
  const connectionStatus = useMemo(() => {
    if (selectedItemIds.length < 2) return { canConnect: false, canDisconnect: false };
    let canConnect = false, canDisconnect = false;
    for (let i = 0; i < selectedItemIds.length - 1; i++) {
      const fromId = selectedItemIds[i], toId = selectedItemIds[i + 1];
      const isConnected = connections.some(c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId));
      if (isConnected) canDisconnect = true;
      else canConnect = true;
    }
    return { canConnect, canDisconnect };
  }, [selectedItemIds, connections]);

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!isAreaSelectionMode && !(e.target instanceof Element && e.target.closest('.board-item-container'))) {
      if (!boardViewportRef.current) return;
      const rect = boardViewportRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      const newNote = addNewItem(ItemType.Note, NOTE_PLACEHOLDER, { x: x - 125, y: y - 125 });
      setEditingItemId(newNote.id);
    }
  };

  const applyFontChange = (fontVal: string) => {
    setCurrentFontFamily(fontVal);
    const updates = selectedItemIds
      .map(id => items.find(x => x.id === id))
      .filter((it): it is BoardItemData => !!it && it.type === ItemType.Note)
      .map(it => ({ id: it.id, updates: { fontFamily: fontVal } }));
    if(updates.length > 0) handleUpdateItems(updates);
  };
  
  const handleSelectShapeTool = (shape: 'arrow' | 'circle' | 'box' | null) => {
    if (activeShapeTool === shape) {
      setActiveShapeTool(null);
    } else {
      setActiveShapeTool(shape);
      setIsAreaSelectionMode(false);
      setIsStyleMenuOpen(false);
    }
  };

  const startDrawingShape = (e: React.PointerEvent) => {
    if (!activeShapeTool || !boardViewportRef.current) return;
    const rect = boardViewportRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    drawingStartPoint.current = { x, y };
    const newShape: BoardItemData = {
      id: 'drawing-shape',
      type: ItemType.Shape,
      shapeType: activeShapeTool,
      x, y,
      width: 0, height: 0,
      rotation: 0,
      zIndex: 99999,
      content: '',
      ...shapeStyle
    };
    setDrawingShape(newShape);
  };

  const updateDrawingShape = (e: React.PointerEvent) => {
    if (!drawingShape || !drawingStartPoint.current || !boardViewportRef.current) return;
    const rect = boardViewportRef.current.getBoundingClientRect();
    let currentX = (e.clientX - rect.left - pan.x) / zoom;
    let currentY = (e.clientY - rect.top - pan.y) / zoom;
    const { x: startX, y: startY } = drawingStartPoint.current;

    if (shiftPressed.current) {
        const dx = currentX - startX;
        const dy = currentY - startY;
        if (drawingShape.shapeType === 'box' || drawingShape.shapeType === 'circle') {
            const side = Math.max(Math.abs(dx), Math.abs(dy));
            currentX = startX + side * Math.sign(dx);
            currentY = startY + side * Math.sign(dy);
        } else if (drawingShape.shapeType === 'arrow') {
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const dist = Math.hypot(dx, dy);
            currentX = startX + dist * Math.cos(snappedAngle);
            currentY = startY + dist * Math.sin(snappedAngle);
        }
    }

    const newX = Math.min(startX, currentX);
    const newY = Math.min(startY, currentY);
    const newWidth = Math.abs(currentX - startX);
    const newHeight = Math.abs(currentY - startY);

    if (drawingShape.shapeType === 'arrow') {
      const safeWidth = newWidth > 1 ? newWidth : 1;
      const safeHeight = newHeight > 1 ? newHeight : 1;
      const startRel = { x: (startX - newX) / safeWidth, y: (startY - newY) / safeHeight };
      const endRel = { x: (currentX - newX) / safeWidth, y: (currentY - newY) / safeHeight };
      setDrawingShape(prev => prev ? { ...prev, x: newX, y: newY, width: newWidth, height: newHeight, content: JSON.stringify({ start: startRel, end: endRel }) } : null);
    } else {
      setDrawingShape(prev => prev ? { ...prev, x: newX, y: newY, width: newWidth, height: newHeight } : null);
    }
  };
  
  const endDrawingShape = () => {
    if (!drawingShape) return;
    if (drawingShape.width > 10 || drawingShape.height > 10) {
      const isArrow = drawingShape.shapeType === 'arrow';
      const newZ = isArrow ? zIndexCounter.arrow + 1 : zIndexCounter.shape + 1;
      const finalShape = { ...drawingShape, id: `item-${Date.now()}`, zIndex: newZ };
      setState(prev => ({ ...prev, items: [...prev.items, finalShape] }));
      setZIndexCounter(prev => isArrow ? { ...prev, arrow: newZ } : { ...prev, shape: newZ });
      setSelectedItemIds([finalShape.id]);
    }
    setActiveShapeTool(null);
    setDrawingShape(null);
    drawingStartPoint.current = null;
  };
  
  const handleToggleStyleMenu = () => {
    setIsStyleMenuOpen(prev => !prev);
    if (!isStyleMenuOpen) {
      setIsAreaSelectionMode(false);
      setActiveShapeTool(null);
    }
  };

  const handleShapeStyleChange = (updates: Partial<ShapeStyle>) => {
    const newStyle = { ...shapeStyle, ...updates };
    setShapeStyle(newStyle);

    const itemUpdates = selectedItemIds
        .map(id => items.find(i => i.id === id))
        .filter((item): item is BoardItemData => !!item && item.type === ItemType.Shape)
        .map(item => ({ id: item.id, updates }));

    if (itemUpdates.length > 0) {
        handleUpdateItems(itemUpdates);
    }
  };

  const handleStartConnection = useCallback((fromId: string, e: React.PointerEvent) => {
    if (!boardViewportRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = boardViewportRef.current.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left - pan.x) / zoom;
    const pointerY = (e.clientY - rect.top - pan.y) / zoom;
    setDrawingConnection({ fromId, toCoords: { x: pointerX, y: pointerY } });
  }, [pan, zoom]);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== connectionId),
    }));
  }, [setState]);

  const handleShowHelp = () => {
    setShowWelcome(true);
  };

  const handleLogout = () => {
    signOut(auth).catch(error => console.error("Error signing out:", error));
  };

  const displayedItems = useMemo(() => {
    const baseItems = items.map(it => ({ ...it, ...transientUpdates[it.id] }));
    if (drawingShape) {
      return [...baseItems, drawingShape];
    }
    return baseItems;
  }, [items, transientUpdates, drawingShape]);

  const showShapeStyleToolbar = activeShapeTool || selectedItemIds.some(id => items.find(i => i.id === id)?.type === ItemType.Shape);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {showWelcome && <WelcomeGuide onClose={() => { setShowWelcome(false); localStorage.setItem('corkboard-welcome-seen', 'true'); }} />}
      <Toolbar {...{onAddItem: handleAddItem, zoomLevel: zoom, onZoomChange: setZoom, onUndo: undo, onRedo: redo, canUndo, canRedo, onThemeChange: handleThemeChange, onBackup: handleBackup, onLoad: handleLoadBackup, boardName: board.name, currentFont: currentFontFamily, onFontChange: applyFontChange, shadowDepth, onShadowChange: setShadowDepth, stringThickness, onStringThicknessChange: setStringThickness, stringTension, onStringTensionChange: setStringTension, onResetBoard: handleResetBoard, onToggleAreaSelection: () => setIsAreaSelectionMode(!isAreaSelectionMode), isAreaSelectionMode, activeShapeTool, onSelectShapeTool: handleSelectShapeTool, onToggleStyleMenu: handleToggleStyleMenu, isStyleMenuOpen, onShowHelp: handleShowHelp }} />
      {showShapeStyleToolbar && <ShapeStyleToolbar style={shapeStyle} onStyleChange={handleShapeStyleChange} />}
      {contextMenuPosition && selectedItemIds.length > 0 && (
        <ContextMenu 
            position={contextMenuPosition}
            onDelete={handleDeleteSelectedItems}
            onBringForward={handleBringSelectedForward}
            onSendBackward={handleSendSelectedBackward}
        />
      )}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
        {connectionStatus.canConnect && <button onClick={handleConnectItems} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105">{`Connect (${selectedItemIds.length})`}</button>}
        {connectionStatus.canDisconnect && <button onClick={handleDisconnectItems} className="px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-all transform hover:scale-105">Disconnect</button>}
      </div>
      <div
        ref={boardViewportRef}
        className={`flex-grow w-full h-full overflow-hidden active:cursor-grabbing theme-${theme} has-grid`}
        style={{
          cursor: drawingConnection ? 'crosshair' : (activeShapeTool ? 'crosshair' : (isAreaSelectionMode ? 'default' : 'grab')),
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onPointerDown={(e) => {
          if (activeShapeTool) {
            startDrawingShape(e);
          } else if (!(e.target instanceof Element && e.target.closest('.board-item-container, .context-menu, .main-toolbar'))) {
            setSelectedItemIds([]);
            setEditingItemId(null);
            if (isAreaSelectionMode) startAreaSelection(e);
          }
        }}
        onPointerMove={(e) => { 
          if (drawingConnection) {
            if (!boardViewportRef.current) return;
            const rect = boardViewportRef.current.getBoundingClientRect();
            const pointerX = (e.clientX - rect.left - pan.x) / zoom;
            const pointerY = (e.clientY - rect.top - pan.y) / zoom;
            setDrawingConnection(prev => prev && ({ ...prev, toCoords: { x: pointerX, y: pointerY }}));
          } else if (drawingShape) {
            updateDrawingShape(e);
          } else if (isAreaSelectionMode) {
            updateAreaSelection(e);
          }
        }}
        onPointerUp={(e) => {
          if (drawingConnection) {
            const targetElement = document.elementFromPoint(e.clientX, e.clientY);
            const targetItemElement = targetElement?.closest('.board-item-container');
            if (targetItemElement) {
              const targetItemId = (targetItemElement as HTMLElement).dataset.itemId;
              if (targetItemId && targetItemId !== drawingConnection.fromId) {
                const isConnected = connections.some(c => 
                  (c.fromId === drawingConnection.fromId && c.toId === targetItemId) ||
                  (c.fromId === targetItemId && c.toId === drawingConnection.fromId)
                );
                if (!isConnected) {
                  setState(prev => {
                    const fromItem = prev.items.find(i => i.id === drawingConnection.fromId);
                    const toItem = prev.items.find(i => i.id === targetItemId);
                    const itemsToUpdate = new Map<string, Partial<BoardItemData>>();
                    if (fromItem && !fromItem.hasPin) itemsToUpdate.set(fromItem.id, { hasPin: true });
                    if (toItem && !toItem.hasPin) itemsToUpdate.set(toItem.id, { hasPin: true });

                    const updatedItems = itemsToUpdate.size > 0
                      ? prev.items.map(item => itemsToUpdate.has(item.id) ? { ...item, ...itemsToUpdate.get(item.id)! } : item)
                      : prev.items;
                    
                    return {
                      items: updatedItems,
                      connections: [...prev.connections, { id: `conn-${drawingConnection.fromId}-${targetItemId}-${Date.now()}`, fromId: drawingConnection.fromId, toId: targetItemId }]
                    }
                  });
                }
              }
            }
            setDrawingConnection(null);
          } else if (drawingShape) {
            endDrawingShape();
          } else if (isAreaSelectionMode) {
            endAreaSelection();
          }
        }}
        onPointerLeave={() => {
          if (drawingConnection) setDrawingConnection(null);
          if (drawingShape) endDrawingShape();
          else if (isAreaSelectionMode) endAreaSelection();
        }}
        onDoubleClick={handleCanvasDoubleClick}>
        <div className="absolute transform-gpu" style={{ width: 5000, height: 5000, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <g>
              {connections.map(conn => {
                const fromItem = displayedItems.find(i => i.id === conn.fromId);
                const toItem = displayedItems.find(i => i.id === conn.toId);
                return fromItem && toItem ? <Connector key={conn.id} id={conn.id} fromItem={fromItem} toItem={toItem} thickness={stringThickness} tension={stringTension} onDelete={handleDeleteConnection} /> : null;
              })}
              {drawingConnection && (() => {
                const fromItem = displayedItems.find(i => i.id === drawingConnection.fromId);
                if (!fromItem) return null;
                const toItem: BoardItemData = {
                  id: 'temp-drag-target',
                  type: ItemType.Note,
                  x: drawingConnection.toCoords.x,
                  y: drawingConnection.toCoords.y,
                  width: 0, height: 0, rotation: 0, zIndex: 0,
                  content: '', hasPin: false
                };
                return <Connector key="drawing-connection" id="drawing-connection" fromItem={fromItem} toItem={toItem} thickness={stringThickness} tension={stringTension} onDelete={() => {}} />;
              })()}
            </g>
          </svg>
          {displayedItems.map(it => <BoardItem key={it.id} item={it} allItems={items} onUpdateItems={handleUpdateItems} onSelect={handleSelectItem} isSelected={selectedItemIds.includes(it.id)} selectedItemIds={selectedItemIds} scale={zoom} setTransientUpdates={setTransientUpdates} shadowDepth={shadowDepth} currentFontFamily={currentFontFamily} isEditing={editingItemId === it.id} onSetEditing={(isEditing) => setEditingItemId(isEditing ? it.id : null)} isNew={newItemIds.includes(it.id)} onStartConnection={handleStartConnection} />)}
        </div>
         {selectionBox && <div className="selection-box fixed" style={{ left: Math.min(selectionBox.startX, selectionBox.endX), top: Math.min(selectionBox.startY, selectionBox.endY), width: Math.abs(selectionBox.endX - selectionBox.startX), height: Math.abs(selectionBox.endY - selectionBox.startY) }} />}
      </div>
      <button
        onClick={handleLogout}
        className="fixed bottom-4 right-4 z-[2001] bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105"
        title="Sign Out"
      >
        <i data-lucide="log-out" className="w-5 h-5"></i>
        <span className="hidden sm:inline">Sign Out</span>
      </button>
      <InputDialog isOpen={dialogState.isOpen} onClose={() => setDialogState({ isOpen: false, type: null, title: '', placeholder: '', defaultValue: '' })} onSubmit={handleDialogSubmit} title={dialogState.title} placeholder={dialogState.placeholder} defaultValue={dialogState.defaultValue} submitButtonText="Add" />
      <ConfirmationDialog isOpen={confirmationState.isOpen} onClose={() => setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: null})} onConfirm={confirmationState.onConfirm} title={confirmationState.title} message={confirmationState.message} />
      <EmojiPickerWrapper isOpen={isEmojiPickerOpen} onEmojiSelect={handleEmojiSelect} onClose={closeEmojiPicker} />
    </div>
  );
};

export default App;