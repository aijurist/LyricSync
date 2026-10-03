import { useCallback, useState } from 'react';

const LIMIT = 100;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/** State with undo/redo. `reset` replaces the value and clears history. */
export function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setHistory((h) => {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(h.present) : next;
      if (Object.is(value, h.present)) return h;
      return { past: [...h.past, h.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);

  const reset = useCallback((value: T) => setHistory({ past: [], present: value, future: [] }), []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    });
  }, []);

  return {
    value: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
