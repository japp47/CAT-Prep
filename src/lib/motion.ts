import { useEffect, type DependencyList, type RefObject } from "react";

/**
 * GSAP, loaded only by the screens that animate with it (D41), so it never joins the first download. The promise is
 * kept, so the second caller gets it at once. Every animation is skipped under reduced motion.
 */
export type Gsap = typeof import("gsap").gsap;

let gsapP: Promise<Gsap> | null = null;
export const loadGsap = (): Promise<Gsap> => (gsapP ??= import("gsap").then((m) => m.gsap));

export type ScrollTriggerT = typeof import("gsap/ScrollTrigger").ScrollTrigger;
let stP: Promise<{ gsap: Gsap; ScrollTrigger: ScrollTriggerT }> | null = null;
/** GSAP with its ScrollTrigger plugin registered, for the animations scrolling drives (the home page, D42). */
export const loadScrollTrigger = () => (stP ??= Promise.all([loadGsap(), import("gsap/ScrollTrigger")]).then(([gsap, m]) => {
  gsap.registerPlugin(m.ScrollTrigger);
  return { gsap, ScrollTrigger: m.ScrollTrigger };
}));

/** The student asked the system for less motion. */
export const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `run` with GSAP once it has loaded, inside a context scoped to `scope`, and reverts it when the deps change or
 * the component goes. Nothing runs under reduced motion.
 */
export function useGsap(scope: RefObject<HTMLElement | null>, run: (gsap: Gsap, el: HTMLElement) => void, deps: DependencyList): void {
  useEffect(() => {
    const el = scope.current;
    if (!el || calm()) return;
    let ctx: ReturnType<Gsap["context"]> | undefined, gone = false;
    loadGsap().then((gsap) => { if (!gone) ctx = gsap.context(() => run(gsap, el), el); }, () => {});
    return () => { gone = true; ctx?.revert(); };
    // The caller lists what the animation depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
