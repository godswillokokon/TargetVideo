import { useEffect, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';

export function useFocusOnMount(
  ref: RefObject<Parameters<typeof findNodeHandle>[0]>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const node = findNodeHandle(ref.current);
      if (node != null) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, ref]);
}
