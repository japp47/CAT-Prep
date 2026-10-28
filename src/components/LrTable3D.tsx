import { useEffect, useRef, type ReactNode } from "react";
import {
  AmbientLight, BoxGeometry, CapsuleGeometry, Color, CylinderGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from "three";
import { calm, loadGsap } from "../lib/motion";

/**
 * A round-table set in 3D (D41): a table, one chair per seat, and a figure that drops into its chair when a step of
 * the walkthrough seats someone. Names are HTML labels pinned above the chairs, so they stay crisp, in the site's font
 * and readable by a screen reader. Drag sideways to turn the table. three.js loads only here, on the review of a
 * circular set; the flat picture stands in while it loads, and for good if WebGL is missing (onFail).
 * Seat 1 is nearest the viewer and the seats run clockwise seen from above, as in the flat picture.
 */

const SEAT_R = 2.35, TABLE_R = 1.5, PERSON_Y = 0.36 + 0.43, LABEL_Y = 1.45;

interface Scene3D { people: Mesh<CapsuleGeometry, MeshStandardMaterial>[]; chairs: Mesh<BoxGeometry, MeshStandardMaterial>[]; render: () => void }

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

export default function LrTable3D({ n, cells, fresh, label, onFail }: {
  n: number; cells: (string[] | null)[]; fresh: boolean[]; label: (seat: number) => ReactNode; onFail: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tags = useRef<(HTMLLIElement | null)[]>([]);
  const scene3d = useRef<Scene3D | null>(null);
  const failed = useRef(onFail);
  failed.current = onFail;

  // The scene, built once per table size.
  useEffect(() => {
    const el = box.current!, cv = canvas.current!;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { failed.current(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 6.6, 5.4);
    // Aimed a little above the table, so the far seats and their labels sit inside the frame.
    camera.lookAt(0, 0.85, 0);
    scene.add(new AmbientLight(0xffffff, 1.7));
    const sun = new DirectionalLight(0xffffff, 1.9);
    sun.position.set(3, 8, 5);
    scene.add(sun);
    const world = new Group();
    scene.add(world);
    const mat = (c: string) => new MeshStandardMaterial({ color: new Color(c), roughness: 0.75, transparent: true });

    const top = new Mesh(new CylinderGeometry(TABLE_R, TABLE_R, 0.14, 64), mat(token("--secondary")));
    top.position.y = 0.6;
    const leg = new Mesh(new CylinderGeometry(0.16, 0.32, 0.6, 24), mat(token("--muted-foreground")));
    leg.position.y = 0.3;
    world.add(top, leg);
    const chairGeo = new BoxGeometry(0.56, 0.36, 0.56), personGeo = new CapsuleGeometry(0.22, 0.42, 6, 16);
    const chairs: Scene3D["chairs"] = [], people: Scene3D["people"] = [];
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n, x = -SEAT_R * Math.sin(a), z = SEAT_R * Math.cos(a);
      const chair = new Mesh(chairGeo, mat(token("--muted-foreground")));
      chair.position.set(x, 0.18, z);
      chair.rotation.y = a;
      const person = new Mesh(personGeo, mat(token("--primary")));
      person.position.set(x, PERSON_Y, z);
      person.visible = false;
      world.add(chair, person);
      chairs.push(chair);
      people.push(person);
    }

    const at = new Vector3();
    const render = () => {
      renderer.render(scene, camera);
      const w = el.clientWidth, h = el.clientHeight;
      people.forEach((p, k) => {
        const tag = tags.current[k];
        if (!tag) return;
        p.getWorldPosition(at);
        at.y = LABEL_Y;
        at.project(camera);
        // Kept inside the box, so a label at the edge of a phone screen is not cut off.
        const tw = tag.offsetWidth, th = tag.offsetHeight;
        const x = Math.min(Math.max(((at.x + 1) / 2) * w, tw / 2), w - tw / 2), y = Math.min(Math.max(((1 - at.y) / 2) * h, th), h);
        tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        // Nearer seats' labels sit on top of farther ones.
        tag.style.zIndex = String(Math.round((1 - at.z) * 1000));
      });
    };
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    // Drag sideways to turn the table; a vertical swipe still scrolls the page (touch-pan-y).
    let from: number | null = null;
    const down = (e: PointerEvent) => { from = e.clientX; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (from === null) return; world.rotation.y += (e.clientX - from) * 0.012; from = e.clientX; render(); };
    const up = () => { from = null; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    scene3d.current = { people, chairs, render };
    let gone = false;
    // One turn into place on arrival, so the table reads as something that can be turned.
    if (!calm()) loadGsap().then((gsap) => { if (!gone) gsap.from(world.rotation, { y: -0.9, duration: 1.4, ease: "power3.out", onUpdate: render }); }, () => {});

    return () => {
      gone = true;
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      loadGsap().then((gsap) => gsap.killTweensOf([world.rotation, ...people.flatMap((p) => [p.position, p.scale])]), () => {});
      scene.traverse((o) => { if (o instanceof Mesh) { o.geometry.dispose(); (o.material as MeshStandardMaterial).dispose(); } });
      renderer.dispose();
      scene3d.current = null;
    };
  }, [n]);

  // Each step: who is seated, who is only possible (faint), which chairs are known to be empty (faint), and a drop
  // for anyone this step seats.
  useEffect(() => {
    const s = scene3d.current;
    if (!s) return;
    cells.forEach((c, k) => {
      const name = c?.[0] ?? "";
      s.people[k].visible = name !== "";
      s.people[k].material.opacity = name.endsWith("?") ? 0.35 : 1;
      s.chairs[k].material.opacity = c === null ? 0.25 : 1;
      s.people[k].position.y = PERSON_Y;
      s.people[k].scale.setScalar(1);
    });
    s.render();
    if (calm()) return;
    let gone = false;
    loadGsap().then((gsap) => {
      if (gone) return;
      fresh.forEach((f, k) => {
        const p = s.people[k];
        if (!f || !p.visible) return;
        gsap.fromTo(p.position, { y: 2.8 }, { y: PERSON_Y, duration: 0.75, delay: 0.05 * k, ease: "bounce.out", onUpdate: s.render });
        gsap.fromTo(p.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1, duration: 0.5, delay: 0.05 * k, ease: "power2.out", onUpdate: s.render });
      });
    }, () => {});
    return () => { gone = true; };
  }, [cells, fresh]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={box} className="relative mx-auto aspect-square w-full max-w-[34rem] cursor-grab touch-pan-y select-none active:cursor-grabbing sm:aspect-[4/3]">
        <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden />
        <ol className="pointer-events-none absolute inset-0" aria-label="Seats">
          {Array.from({ length: n }, (_, k) => (
            <li key={k} ref={(x) => { tags.current[k] = x; }} className="absolute top-0 left-0 will-change-transform">{label(k)}</li>
          ))}
        </ol>
      </div>
      <p className="text-center text-sm text-muted-foreground">Drag sideways to turn the table.</p>
    </div>
  );
}
