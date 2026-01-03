import { useEffect, useCallback, useRef } from 'react';

type VisibilityCallback = () => void;

// Global set to track all callbacks
const callbacks = new Set<VisibilityCallback>();
let isListenerAttached = false;

// Single global handler
const handleVisibilityChange = () => {
  if (!document.hidden) {
    callbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('Error in visibility callback:', error);
      }
    });
  }
};

/**
 * Centralized hook for visibility change events.
 * Uses a single global event listener to reduce NPROC leaks.
 * 
 * @param callback - Function to call when tab becomes visible
 * @param enabled - Whether the callback is active (default: true)
 */
export const useVisibilityChange = (callback: VisibilityCallback, enabled = true) => {
  const callbackRef = useRef(callback);
  
  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Stable wrapper that uses the ref
  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    
    callbacks.add(stableCallback);
    
    // Attach global listener only once
    if (!isListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      isListenerAttached = true;
    }
    
    return () => {
      callbacks.delete(stableCallback);
      
      // Remove global listener when no callbacks remain
      if (callbacks.size === 0 && isListenerAttached) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        isListenerAttached = false;
      }
    };
  }, [stableCallback, enabled]);
};
