

import { useState, useEffect, useCallback } from 'react';

interface Timeline<T> {
  past: T[];
  present: T;
  future: T[];
}

const getStorageValue = <T,>(key: string, def: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved) as T;
    }
  } catch (error) {
    console.warn(`Could not read from localStorage for key "${key}":`, error);
  }
  return def;
};

export const usePersistentHistory = <T,>(storageKey: string, initialPresent: T) => {
  const [timeline, setTimeline] = useState<Timeline<T>>(() => ({
    past: [],
    present: getStorageValue(storageKey, initialPresent),
    future: [],
  }));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(timeline.present));
    } catch (error) {
      console.warn(`Could not write to localStorage for key "${storageKey}":`, error);
    }
  }, [storageKey, timeline.present]);

  const canUndo = timeline.past.length > 0;
  const canRedo = timeline.future.length > 0;

  const setState = useCallback((action: T | ((prevState: T) => T)) => {
    setTimeline(current => {
      const newPresent = typeof action === 'function' ? (action as (prevState: T) => T)(current.present) : action;
      if (JSON.stringify(newPresent) === JSON.stringify(current.present)) return current;
      return {
        past: [...current.past, current.present],
        present: newPresent,
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    setTimeline(current => {
      if (!canUndo) return current;
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    setTimeline(current => {
      if (!canRedo) return current;
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture
      };
    });
  }, [canRedo]);

  return {
    state: timeline.present,
    setState,
    undo,
    redo,
    canUndo,
    canRedo
  };
};