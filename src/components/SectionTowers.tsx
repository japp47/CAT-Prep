import { useEffect, useRef } from "react";
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshLambertMaterial,
  PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer, type Object3D,
} from "three";
import { calm, loadGsap } from "../lib/motion";

/**
 * The three sections as towers of blocks (D69, docs/design/all-pages.md), in the "All pages" panel. A block is a number
 * of sets on the site, or of the student's own answers in the last 30 days once they have some: real data, not a
 * brand object (D51). A section that is not open yet is an outline. Hovering a section's link lifts its tower;
 * hovering a tower lights its link, and a click opens it. Blocks drop in once when the panel opens; nothing moves
 * under reduced motion. Loaded only with the panel (D41).
 */

export type Sec = "varc" | "dilr" | "quant";
export interface Tower { sec: Sec; blocks: number; soon?: boolean }

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
const W = 0.95, H = 0.2, GAP = 0.06, APART = 1.75;

export default function SectionTowers({ towers, hot, onHot, onPick, onFail }: { towers: Tower[]; hot: Sec | null; onHot: (s: Sec | null) => void; onPick: (s: Sec) => void; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<{ setHot: (s: Sec | null) => void } | null>(null);
  const cb = useRef({ onHot, onPick });
  cb.current = { onHot, onPick };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onFail();
      return;
    }
    const still = calm();
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";

    const scene = new Scene();
    const camera = new PerspectiveCamera(26, 1, 0.1, 100);
    const top = Math.max(4, ...towers.map((t) => t.blocks));
    // A three-quarter view from a little to the right and above, close enough to fill the frame, so no tower hides another.
    const mid = (top * (H + GAP)) / 2;
    const far = 7.2 + mid * 1.6;
    camera.position.set(far * 0.3, mid + far * 0.32, far);
    camera.lookAt(0, mid * 0.85, 0);
    scene.add(new AmbientLight(0xffffff, 1.6));
    const sun = new DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 9, 6);
    scene.add(sun);

    const primary = new Color(token("--primary"));
    // At rest every tower is a softer blue; the one in focus takes the full colour and the rest go quiet.
    const rest = primary.clone().lerp(new Color(token("--card")), 0.3);
    const quiet = new Color(token("--muted-foreground")).lerp(new Color(token("--background")), 0.55);
    const plate = new Color(token("--secondary"));
    const geo = new BoxGeometry(W, H, W);
    const edges = new EdgesGeometry(geo);
    const world = new Group();
    scene.add(world);

    const groups = towers.map((t, i) => {
      const g = new Group();
      g.position.x = (i - (towers.length - 1) / 2) * APART;
      g.userData.sec = t.sec;
      const base = new Mesh(new BoxGeometry(W + 0.24, 0.06, W + 0.24), new MeshLambertMaterial({ color: plate }));
      base.position.y = -0.03;
      base.userData.sec = t.sec;
      g.add(base);
      const mat = new MeshLambertMaterial({ color: rest.clone() });
      const blocks: Object3D[] = [];
      const n = t.blocks;
      for (let k = 0; k < n; k++) {
        const y = H / 2 + k * (H + GAP);
        const b = t.soon
          ? new LineSegments(edges, new LineBasicMaterial({ color: quiet, transparent: true, opacity: 0.8 }))
          : new Mesh(geo, mat);
        b.position.y = y;
        b.userData = { sec: t.sec, y };
        g.add(b);
        blocks.push(b);
      }
      // A hit box the height of the tower, so the pointer finds a short tower as easily as a tall one.
      const hit = new Mesh(new BoxGeometry(W + 0.3, Math.max(1.2, n * (H + GAP)) + 0.3, W + 0.3), new MeshLambertMaterial({ visible: false }));
      hit.position.y = (n * (H + GAP)) / 2;
      hit.userData.sec = t.sec;
      g.add(hit);
      world.add(g);
      return { g, mat, blocks, soon: !!t.soon, hit };
    });

    let w = 0, h = 0;
    const size = () => {
      w = el.clientWidth; h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px";
      renderer.domElement.style.height = h + "px";
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    size();
    const render = () => renderer.render(scene, camera);
    const ro = new ResizeObserver(() => { size(); render(); });
    ro.observe(el);

    let gsap: Awaited<ReturnType<typeof loadGsap>> | null = null;
    let current: Sec | null = null;
    const paint = (s: Sec | null) => groups.forEach(({ g, mat, soon }) => {
      const color = s === null ? rest : g.userData.sec === s ? primary : quiet;
      const lift = s !== null && g.userData.sec === s ? 0.28 : 0;
      if (gsap && !still) {
        if (!soon) gsap.to(mat.color, { r: color.r, g: color.g, b: color.b, duration: 0.3, ease: "power2.out" });
        gsap.to(g.position, { y: lift, duration: 0.45, ease: "back.out(2)" });
      } else {
        if (!soon) mat.color.copy(color);
        g.position.y = lift;
        render();
      }
    });
    api.current = { setHot: (s) => { if (s !== current) { current = s; paint(s); } } };

    // Pointer: which tower is under it, and a slight lean towards it.
    const ray = new Raycaster(), at = new Vector2();
    const hits = groups.map((x) => x.hit);
    const pick = (e: PointerEvent): Sec | null => {
      const r = renderer.domElement.getBoundingClientRect();
      at.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(at, camera);
      return (ray.intersectObjects(hits)[0]?.object.userData.sec as Sec | undefined) ?? null;
    };
    let lean = 0, leanTo = 0;
    const move = (e: PointerEvent) => {
      const s = pick(e);
      renderer.domElement.style.cursor = s && !towers.find((t) => t.sec === s)?.soon ? "pointer" : "default";
      cb.current.onHot(s);
      const r = renderer.domElement.getBoundingClientRect();
      leanTo = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
    };
    const leave = () => { cb.current.onHot(null); leanTo = 0; };
    const click = (e: PointerEvent) => { const s = pick(e); if (s && !towers.find((t) => t.sec === s)?.soon) cb.current.onPick(s); };
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("click", click as EventListener);

    const tick = () => {
      if (!still) { lean += (leanTo - lean) * 0.08; world.rotation.y = lean; }
      render();
    };
    let gone = false;
    render();
    if (!still) {
      loadGsap().then((g) => {
        if (gone) return;
        gsap = g;
        g.ticker.add(tick);
        // The one moment: blocks drop onto their plates, tower by tower, bottom first.
        groups.forEach(({ blocks }, i) => blocks.forEach((b, k) => {
          const y = b.userData.y as number;
          b.position.y = y + 2.4;
          b.scale.setScalar(0.001);
          g.to(b.position, { y, duration: 0.55, delay: 0.08 + i * 0.12 + k * 0.035, ease: "bounce.out" });
          g.to(b.scale, { x: 1, y: 1, z: 1, duration: 0.25, delay: 0.08 + i * 0.12 + k * 0.035, ease: "power2.out" });
        }));
        paint(current);
      }, () => {});
    }

    return () => {
      gone = true;
      gsap?.ticker.remove(tick);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("click", click as EventListener);
      scene.traverse((o) => { const m = o as Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose()); });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // The towers are fixed while the panel is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.setHot(hot); }, [hot]);

  return <div ref={box} className="h-full w-full" />;
}
