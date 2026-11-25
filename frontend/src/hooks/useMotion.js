import { useEffect, useState } from 'react';

/**
 * Returns true only on fine-pointer desktop devices when reduced motion is off.
 * Prevents sticky pointer-based tilt or parallax on touch devices.
 */
export function useFinePointerMotion() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return fine && !reduced;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      setEnabled(fineQuery.matches && !motionQuery.matches);
    };

    fineQuery.addEventListener('change', update);
    motionQuery.addEventListener('change', update);
    return () => {
      fineQuery.removeEventListener('change', update);
      motionQuery.removeEventListener('change', update);
    };
  }, []);

  return enabled;
}

/**
 * Lightweight requestAnimationFrame-throttled scroll parallax tracker.
 * Updates CSS custom property --scroll-y on a target ref without causing React re-renders.
 */
export function useScrollParallaxVar(targetRef) {
  useEffect(() => {
    const el = targetRef?.current;
    if (!el || typeof window === 'undefined') return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.style.setProperty('--scroll-y', '0');
      return undefined;
    }

    let rafId = null;

    const applyScroll = () => {
      rafId = null;
      const clamped = Math.min(window.scrollY || 0, 2400);
      el.style.setProperty('--scroll-y', String(clamped));
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyScroll);
      }
    };

    applyScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [targetRef]);
}

/**
 * Observes .reveal-item and .reveal-scale children within containerRef
 * and marks them .is-visible once upon intersecting the viewport.
 */
export function useScrollReveal(containerRef, triggerKey) {
  useEffect(() => {
    const root = containerRef?.current;
    if (!root || typeof window === 'undefined') return undefined;

    const targets = root.querySelectorAll('.reveal-item, .reveal-scale');
    if (!targets.length) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      targets.forEach((node) => node.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -36px 0px',
      }
    );

    targets.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [containerRef, triggerKey]);
}

