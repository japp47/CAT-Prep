import { useEffect, useRef, useState, type RefObject } from "react";
import {
  BufferAttribute, BufferGeometry, CanvasTexture, Color, Group, PerspectiveCamera, Plane, Points, PointsMaterial, Raycaster, Scene, Vector2,
  Vector3, WebGLRenderer,
} from "three";
import { cn } from "@/lib/utils";
import { calm, loadGsap, loadScrollTrigger } from "../../lib/motion";
import { curveColumns, ordinal, percentileAt, Z99 } from "./curve";

/**
 * The home page's hero picture (D42): the CAT score curve as a field of dots in 3D. Each dot is a group of test takers;
 * the top one in a hundred are in highlighter yellow; the blue dot is an illustration of a climb, never the visitor's
 * own percentile (D51): that is shown only on Progress, from a logged score. The dots fall into place once;
 * scrolling the hero walks the blue dot up the curve while its label reads the percentile it has reached. With a mouse the hill is a
 * toy: it leans towards the pointer and swells under it, a drag turns it and it springs back when let go, and a click
 * sends a ripple through the crowd and returns it to its resting pose. Labels are HTML pinned to the scene. Loaded on
 * its own, after the page shows (D41).
 */

const GAP = 0.07, X = 0.95;

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

/** A soft round dot, so points are discs rather than squares. */
function disc(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fillStyle = "#fff";
  g.fill();
  return new CanvasTexture(c);
}

/** A soft light, for the glow of the top 1% and the halo round the student's dot. */
function glow(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export default function PercentileField({ track, onReady, onFail }: { track: RefObject<HTMLElement | null>; onReady: () => void; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const youTag = useRef<HTMLDivElement>(null);
  const topTag = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);
  const cb = useRef({ onReady, onFail });
  cb.current = { onReady, onFail };

  useEffect(() => {
    const el = box.current!, cv = canvas.current!;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { cb.current.onFail(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const still = calm();
    const narrow = el.clientWidth < 640;

    // The dots: columns of the curve, a few deep, so the field has volume when it turns.
    const rows = narrow ? 20 : 25, depth = narrow ? 3 : 5;
    const cols = curveColumns(narrow ? 61 : 81, rows);
    const target: number[] = [], top: boolean[] = [], col: number[] = [];
    cols.forEach(({ z, n }, c) => {
      for (let r = 0; r < n; r++) for (let d = 0; d < depth; d++) {
        target.push(z * X, r * GAP, (d - (depth - 1) / 2) * GAP);
        top.push(z >= Z99);
        col.push(c);
      }
    });
    const count = top.length;
    const pos = new Float32Array(target);
    const colors = new Float32Array(count * 3);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    const tex = disc();
    const mat = new PointsMaterial({ size: narrow ? 0.07 : 0.06, vertexColors: true, map: tex, alphaTest: 0.5, transparent: true });
    const dots = new Points(geo, mat);

    // The top 1% glow: a soft larger copy of each yellow dot behind it.
    const topIdx = top.flatMap((t, i) => (t ? [i] : []));
    const glowPos = new Float32Array(topIdx.length * 3);
    const glowGeo = new BufferGeometry();
    glowGeo.setAttribute("position", new BufferAttribute(glowPos, 3));
    const soft = glow();
    const glowMat = new PointsMaterial({ size: 0.22, map: soft, transparent: true, opacity: 0.4, depthWrite: false });
    const shine = new Points(glowGeo, glowMat);

    // The student: one bigger dot riding the top of the curve.
    const youGeo = new BufferGeometry();
    youGeo.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
    const youMat = new PointsMaterial({ size: 0.24, map: tex, alphaTest: 0.5, transparent: true });
    const you = new Points(youGeo, youMat);
    const haloMat = new PointsMaterial({ size: 0.6, map: soft, transparent: true, opacity: 0.5, depthWrite: false });
    const halo = new Points(youGeo, haloMat);

    const scene = new Scene();
    const field = new Group();
    field.add(shine, dots, halo, you);
    field.position.y = -0.75;
    field.rotation.y = -0.22;
    scene.add(field);
    const camera = new PerspectiveCamera(34, 1, 0.1, 60);

    const paint = () => {
      const bg = new Color(token("--background")), ink = new Color(token("--primary")), hl = new Color(token("--highlight"));
      const faint = ink.clone().lerp(bg, 0.45);
      // On paper the pale highlighter needs a little ink to show as dots.
      const light = bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
      const gold = light ? hl.clone().lerp(new Color(token("--highlight-foreground")), 0.3) : hl;
      for (let i = 0; i < count; i++) (top[i] ? gold : faint).toArray(colors, i * 3);
      geo.attributes.color.needsUpdate = true;
      glowMat.color = gold;
      youMat.color = ink;
      haloMat.color = ink;
    };
    paint();

    const heightAt = (z: number) => Math.max(1, Math.round(rows * Math.exp((-z * z) / 2))) * GAP;
    const at = new Vector3();
    const pin = (tag: HTMLDivElement | null, v: Vector3) => {
      if (!tag) return;
      at.copy(v).applyMatrix4(field.matrixWorld).project(camera);
      const w = el.clientWidth, h = el.clientHeight, tw = tag.offsetWidth;
      const x = Math.min(Math.max(((at.x + 1) / 2) * w, tw / 2), w - tw / 2);
      tag.style.transform = `translate(${x}px, ${((1 - at.y) / 2) * h}px) translate(-50%, -100%)`;
    };
    let youZ = 0, turn = 0;
    // As the student climbs, the field turns a little, so the tail they are heading for comes round to face them.
    const place = (z: number) => {
      youZ = z;
      turn = (-0.35 * z) / (Z99 + 0.15);
      setYou(performance.now() / 1000);
      setPct(percentileAt(z));
    };

    // What the pointer does to the hill: `px` is where it is along the curve, `amp` how much it is swelling (eases in and
    // out as the pointer enters and leaves), and each click leaves a ripple that runs outwards and dies away.
    const touch = { px: 0, amp: 0, aim: 0 };
    const ripples: { x: number; t: number }[] = [];
    const scale = (x: number) => 1 + touch.amp * 0.5 * Math.exp(-((x - touch.px) ** 2) / 0.3);
    const wave = (x: number, now: number) => {
      let y = 0;
      for (const r of ripples) {
        const dt = now - r.t, front = Math.abs(x - r.x) - dt * 2.4;
        y += 0.5 * Math.exp(-(front * front) / 0.08) * Math.exp(-dt * 1.1);
      }
      return y;
    };
    const setYou = (now: number) => {
      const p = youGeo.attributes.position as BufferAttribute;
      const x = youZ * X;
      p.setXYZ(0, x, heightAt(youZ) * scale(x) + wave(x, now) + GAP * 1.6, 0);
      p.needsUpdate = true;
    };
    place(0);

    // The dots fall into place once, the middle of the curve first, then breathe: a slow swell runs along the curve.
    const start = new Float32Array(count);
    for (let i = 0; i < count; i++) start[i] = target[i * 3 + 1] + 2.2 + Math.random() * 1.8;
    const mid = (cols.length - 1) / 2;
    const fall = { t: 1 };
    const step = (now: number) => {
      for (let i = 0; i < count; i++) {
        const delay = (Math.abs(col[i] - mid) / mid) * 0.45;
        const k = Math.min(1, Math.max(0, (fall.t - delay) / 0.55)), e = 1 - (1 - k) ** 3;
        const x = target[i * 3];
        const swell = still ? 0 : 0.02 * Math.sin(now * 1.3 + x * 1.7 + target[i * 3 + 2] * 6) + wave(x, now);
        pos[i * 3 + 1] = start[i] + (target[i * 3 + 1] * scale(x) - start[i]) * e + swell;
      }
      topIdx.forEach((i, j) => { glowPos[j * 3] = pos[i * 3]; glowPos[j * 3 + 1] = pos[i * 3 + 1]; glowPos[j * 3 + 2] = pos[i * 3 + 2]; });
      geo.attributes.position.needsUpdate = true;
      glowGeo.attributes.position.needsUpdate = true;
    };
    step(0);
    const render = () => {
      renderer.render(scene, camera);
      field.updateMatrixWorld();
      const yx = youZ * X, tx = (Z99 + 0.25) * X, now = performance.now() / 1000;
      pin(youTag.current, new Vector3(yx, heightAt(youZ) * scale(yx) + wave(yx, now) + GAP * 4, 0));
      pin(topTag.current, new Vector3(tx, heightAt(Z99) * scale(tx) + GAP * 6, 0));
    };
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // A narrow box steps back, so the whole curve still fits across it.
      const back = (camera.aspect > 1 ? 6.8 : 7.4) / Math.min(1, camera.aspect * 1.05);
      camera.position.set(0, 2.1, back);
      camera.lookAt(0, 0.5, 0);
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    // Light or dark theme switched while the page is open.
    const mo = new MutationObserver(() => { paint(); render(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => { paint(); render(); };
    mq.addEventListener("change", onScheme);

    let gone = false, frame = 0, visible = true;
    // The resting pose is fixed; the pointer's lean and a drag are offsets on top of it, and both return to zero. The
    // lean is measured inside the picture's own box, so it no longer depends on how far the page has scrolled.
    const tilt = { x: 0, y: 0 }, aim = { x: 0, y: 0 }, drag = { x: 0, y: 0 };
    const ray = new Raycaster(), ndc = new Vector2(), plane = new Plane(), hit = new Vector3(), normal = new Vector3();
    const along = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      plane.setFromNormalAndCoplanarPoint(normal.set(0, 0, 1).applyQuaternion(field.quaternion), field.position);
      if (ray.ray.intersectPlane(plane, hit)) touch.px = field.worldToLocal(hit).x;
    };
    let gsapRef: Awaited<ReturnType<typeof loadGsap>> | null = null;
    let down: { x: number; y: number; moved: number } | null = null;
    const home = () => gsapRef?.to(drag, { x: 0, y: 0, duration: 1.6, ease: "elastic.out(1, 0.5)", overwrite: true });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      aim.y = (u - 0.5) * 0.3;
      aim.x = (v - 0.5) * 0.08;
      touch.aim = 1;
      along(e);
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        down.moved += Math.abs(dx) + Math.abs(dy);
        drag.y = Math.min(1.2, Math.max(-1.2, drag.y + dx * 0.009));
        drag.x = Math.min(0.12, Math.max(-0.3, drag.x + dy * 0.003));
        down.x = e.clientX; down.y = e.clientY;
      }
    };
    const onLeave = () => { aim.x = aim.y = 0; touch.aim = 0; };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, moved: 0 };
      gsapRef?.killTweensOf(drag);
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      if (!down) return;
      // A click (no real drag) sends a ripple from where it landed; either way the hill goes back to rest.
      if (down.moved < 6) { ripples.push({ x: touch.px, t: performance.now() / 1000 }); if (ripples.length > 4) ripples.shift(); }
      down = null;
      home();
    };
    const loop = () => {
      frame = 0;
      if (gone || !visible) return;
      tilt.x += (aim.x - tilt.x) * 0.06;
      tilt.y += (aim.y - tilt.y) * 0.06;
      touch.amp += (touch.aim - touch.amp) * 0.05;
      field.rotation.set(tilt.x + drag.x, -0.22 + turn + tilt.y + drag.y, 0);
      const now = performance.now() / 1000;
      while (ripples.length && now - ripples[0].t > 3) ripples.shift();
      step(now);
      setYou(now);
      haloMat.size = 0.55 + 0.16 * Math.sin(now * 2.6);
      render();
      frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !still && !frame) frame = requestAnimationFrame(loop); });
    io.observe(el);
    if (!still) {
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    }

    const kills: (() => void)[] = [];
    if (still) render();
    else {
      fall.t = 0;
      step(0);
      loadGsap().then((gsap) => {
        if (gone) return;
        gsapRef = gsap;
        const tw = gsap.to(fall, { t: 1, duration: 2, ease: "none" });
        kills.push(() => tw.kill());
      }, () => { fall.t = 1; });
      // Scrolling walks the student up to the 99th percentile: over the hero when the picture is in view on arrival (a
      // wide screen), else while the picture itself crosses the screen (a phone, where it starts below the fold).
      loadScrollTrigger().then(({ ScrollTrigger }) => {
        if (gone || !track.current) return;
        const seen = el.getBoundingClientRect().bottom <= window.innerHeight;
        const range = seen ? { trigger: track.current, start: "top top", end: "bottom 30%" } : { trigger: el, start: "top 70%", end: "bottom 25%" };
        const st = ScrollTrigger.create({ ...range, scrub: 0.6, onUpdate: (s) => place(s.progress * (Z99 + 0.15)) });
        kills.push(() => st.kill());
      }, () => {});
    }
    cb.current.onReady();

    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      kills.forEach((k) => k());
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", onScheme);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      gsapRef?.killTweensOf(drag);
      geo.dispose(); youGeo.dispose(); glowGeo.dispose(); mat.dispose(); youMat.dispose(); glowMat.dispose(); haloMat.dispose(); tex.dispose(); soft.dispose();
      renderer.dispose();
    };
  }, [track]);

  return (
    <div ref={box} className="absolute inset-0 touch-pan-y [@media(pointer:fine)]:cursor-grab [@media(pointer:fine)]:active:cursor-grabbing">
      <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden />
      {/* Once the climber reaches the yellow tail, its own label says it. */}
      <div ref={topTag} className={cn("pointer-events-none absolute top-0 left-0 rounded-md bg-highlight px-2 py-0.5 text-sm font-semibold whitespace-nowrap text-highlight-foreground transition-opacity", pct >= 98 && "opacity-0")} aria-hidden>
        99th percentile
      </div>
      <div ref={youTag} className="pointer-events-none absolute top-0 left-0 rounded-md bg-primary px-2 py-0.5 text-sm font-semibold whitespace-nowrap text-primary-foreground" aria-hidden>
        {ordinal(pct)} percentile
      </div>
    </div>
  );
}
