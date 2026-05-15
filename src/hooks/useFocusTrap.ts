import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hook for managing focus trap in modals
 * - Traps tab focus within the modal
 * - Restores focus to trigger element when closed
 * - Handles Escape key to close modal
 */
export const useFocusTrap = (
  ref: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
  isOpen: boolean
) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref updated with the latest callback
  onCloseRef.current = onClose;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Close modal on Escape
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      // Tab focus trap
      if (e.key !== 'Tab' || !ref.current) return;

      const focusableElements = ref.current.querySelectorAll(
        FOCUSABLE_SELECTOR
      ) as NodeListOf<HTMLElement>;

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Shift+Tab from first element → focus last
      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab from last element → focus first
      else if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },
    [ref]
  );

  // Effect to handle saving and restoring focus on open/close transitions
  useEffect(() => {
    if (isOpen) {
      // Save the previously focused element ONLY when the modal opens
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the modal or first focusable element ONLY once when opening
      if (ref.current) {
        const focusableElements = ref.current.querySelectorAll(
          FOCUSABLE_SELECTOR
        ) as NodeListOf<HTMLElement>;

        // Only move focus if the active element is not already inside the modal
        if (!ref.current.contains(document.activeElement)) {
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else {
            ref.current.focus();
          }
        }
      }
    } else {
      // Restore focus when the modal closes
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }
  }, [isOpen, ref]);

  // Effect to handle keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Also restore focus on unmount if it hasn't been done yet
  useEffect(() => {
    return () => {
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, []);
};
