/**
 * letterpad-styles.ts — the two bits of document plumbing the letterpad
 * screens share: its typefaces, and a stylesheet injected once.
 *
 * The letterhead's four faces are not part of the app's global font stack —
 * only the screens that draw the letterhead should pay for them — and the
 * body's typography is generated (letterBodyCss) rather than written in a CSS
 * file, so it needs somewhere to be put.
 */

import { useEffect } from 'react';
import { LETTERPAD_FONTS_HREF } from '@/lib/letterpad';

/** Loads Bebas Neue, Solway, Tinos and Cormorant Garamond, once per page. */
export function useLetterpadFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${LETTERPAD_FONTS_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LETTERPAD_FONTS_HREF;
    document.head.appendChild(link);
  }, []);
}

/**
 * Keeps one `<style id="lp-style-{id}">` in the head holding `css`.
 *
 * The rules are generated from the same table the PDF renderer works from, so
 * they cannot live in a stylesheet; injecting them by id means the editor and
 * the preview can both ask for the same block and only one arrives.
 */
export function useInjectedCss(id: string, css: string) {
  useEffect(() => {
    const elementId = `lp-style-${id}`;
    let style = document.getElementById(elementId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = elementId;
      document.head.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }, [id, css]);
}
