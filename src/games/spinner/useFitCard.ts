import { useLayoutEffect, useRef } from 'react';

const MIN_FONT_PX = 16;

// The question card never scrolls: if the text doesn't fit the screen, its font
// steps down until the whole card does. Re-fitted on every new card and resize.
export function useFitCard<T extends HTMLElement>(key: string | null) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const text = ref.current;
      const card = text?.closest<HTMLElement>('.modal');
      const backdrop = card?.parentElement;
      if (!text || !card || !backdrop) return;
      text.style.fontSize = '';
      const cs = getComputedStyle(backdrop);
      const room = backdrop.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0');
      if (!(room > 0)) return;
      let size = parseFloat(getComputedStyle(text).fontSize) || 26;
      while (card.scrollHeight > room && size > MIN_FONT_PX) {
        size = Math.max(MIN_FONT_PX, size - 1);
        text.style.fontSize = `${size}px`;
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [key]);
  return ref;
}
