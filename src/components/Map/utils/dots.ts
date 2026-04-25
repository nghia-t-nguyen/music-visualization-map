import * as THREE from "three";
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { type Dot } from '../../../data/DotType';
import { DOT_Z_OFFSET } from "../../../constants";
import { emotionColorMap } from "../../../data/EmotionColorMap";

interface DotParams {
  topologyDispImage: HTMLImageElement;
  topologyScale: number;
  planeWidth: number;
  planeHeight: number;
  dots: Dot[]
}

const HEX_CELL_SIZE = 0.4;

const DOT_RADIUS_MIN = 0.25;
const DOT_RADIUS_MAX = 1;

// Wireframe shell sits just outside the solid sphere to avoid z-fighting
const WIREFRAME_RADIUS_SCALE = 1.08;
const WIREFRAME_OPACITY = 0.3;

// ── Hex grid helpers ───────────────────────────────────────────────────────────

const snapToHexGrid = (
  x: number,
  y: number,
  cellSize: number
): [number, number] => {
  const colSpacing = cellSize * 1.5;
  const rowSpacing = cellSize * Math.sqrt(3);
  const col = Math.round(x / colSpacing);
  const candidates: [number, number][] = [];

  for (const dc of [-1, 0, 1]) {
    const c = col + dc;
    const colX = c * colSpacing;
    const rowOffset = c % 2 !== 0 ? rowSpacing / 2 : 0;
    const row = Math.round((y - rowOffset) / rowSpacing);
    const rowY = row * rowSpacing + rowOffset;
    candidates.push([colX, rowY]);
  }

  return candidates.reduce<[number, number]>((best, pt) => {
    const d = (pt[0] - x) ** 2 + (pt[1] - y) ** 2;
    const bd = (best[0] - x) ** 2 + (best[1] - y) ** 2;
    return d < bd ? pt : best;
  }, candidates[0]);
};

const axialToWorld = (
  q: number,
  r: number,
  cellSize: number
): [number, number] => {
  const colSpacing = cellSize * 1.5;
  const rowSpacing = cellSize * Math.sqrt(3);
  const wx = q * colSpacing;
  const wy = r * rowSpacing + (q % 2 !== 0 ? rowSpacing / 2 : 0);
  return [wx, wy];
};

const worldToAxial = (
  x: number,
  y: number,
  cellSize: number
): [number, number] => {
  const colSpacing = cellSize * 1.5;
  const rowSpacing = cellSize * Math.sqrt(3);
  const q = Math.round(x / colSpacing);
  const rowOffset = q % 2 !== 0 ? rowSpacing / 2 : 0;
  const r = Math.round((y - rowOffset) / rowSpacing);
  return [q, r];
};

const hexKey = (x: number, y: number): string =>
  `${Math.round(x * 1000)},${Math.round(y * 1000)}`;

const hexesWithinRings = (q0: number, r0: number, rings: number): [number, number][] => {
  const result: [number, number][] = [];
  for (let q = -rings; q <= rings; q++) {
    const r1 = Math.max(-rings, -q - rings);
    const r2 = Math.min(rings, -q + rings);
    for (let r = r1; r <= r2; r++) {
      result.push([q0 + q, r0 + r]);
    }
  }
  return result;
};

const findAndOccupyHexPoint = (
  x: number,
  y: number,
  cellSize: number,
  occupied: Set<string>,
  reservationRings: number
): [number, number] => {
  const directions: [number, number][] = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  ];

  const [snapX, snapY] = snapToHexGrid(x, y, cellSize);
  const [q0, r0] = worldToAxial(snapX, snapY, cellSize);

  const visited = new Set<string>();
  const queue: [number, number, number, number][] = [[q0, r0, snapX, snapY]];
  visited.add(`${q0},${r0}`);

  while (queue.length > 0) {
    const [q, r, wx, wy] = queue.shift()!;

    const footprint = hexesWithinRings(q, r, reservationRings);
    const footprintFree = footprint.every(([fq, fr]) => {
      const [fwx, fwy] = axialToWorld(fq, fr, cellSize);
      return !occupied.has(hexKey(fwx, fwy));
    });

    if (footprintFree) {
      for (const [fq, fr] of footprint) {
        const [fwx, fwy] = axialToWorld(fq, fr, cellSize);
        occupied.add(hexKey(fwx, fwy));
      }
      return [wx, wy];
    }

    for (const [dq, dr] of directions) {
      const nq = q + dq;
      const nr = r + dr;
      const nk = `${nq},${nr}`;
      if (!visited.has(nk)) {
        visited.add(nk);
        const [nwx, nwy] = axialToWorld(nq, nr, cellSize);
        queue.push([nq, nr, nwx, nwy]);
      }
    }
  }

  return [snapX, snapY];
};

// ── Exports ────────────────────────────────────────────────────────────────────

export const getHoveredDot = (
  event: MouseEvent,
  camera: THREE.Camera,
  dotsGroup: THREE.Group
) => {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dotsGroup.children, true);

  return intersects.length > 0 ? intersects[0].object as THREE.Mesh : null;
};

export const createMapDots = ({
  topologyDispImage,
  topologyScale,
  planeWidth,
  planeHeight,
  dots
}: DotParams) => {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return group;

  const getVal = (img: HTMLImageElement, u: number, v: number): number => {
    canvas.width = 1;
    canvas.height = 1;
    ctx.drawImage(img, u * img.width, (1 - v) * img.height, 1, 1, 0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[0] / 255;
  };

  const sampleWorldZ = (wx: number, wy: number): number => {
    const u = wx / planeWidth + 0.5;
    const v = wy / planeHeight + 0.5;
    const h = getVal(topologyDispImage, u, v);
    return (h * topologyScale);
  };

  // ── Group by (locationName, emotion) ─────────────────────────────────────────
  const byLocationEmotion = new Map<string, Dot[]>();
  for (const dot of dots) {
    const key = `${dot.locationName}||${dot.emotion}`;
    if (!byLocationEmotion.has(key)) byLocationEmotion.set(key, []);
    byLocationEmotion.get(key)!.push(dot);
  }

  const stacks = Array.from(byLocationEmotion.values());
  const maxCount = Math.max(...stacks.map(s => s.length));
  const minCount = Math.min(...stacks.map(s => s.length));
  const countRange = Math.max(1, maxCount - minCount);

  const radiusForCount = (count: number): number => {
    const t = Math.cbrt((count - minCount) / countRange);
    return DOT_RADIUS_MIN + t * (DOT_RADIUS_MAX - DOT_RADIUS_MIN);
  };

  const reservationRingsForRadius = (radius: number): number => {
    if (radius >= 0.55) return 2;
    if (radius >= 0.35) return 1;
    return 0;
  };

  stacks.sort((a, b) => b.length - a.length);

  const occupiedHexPoints = new Set<string>();

  stacks.forEach((stackDots) => {
    const count = stackDots.length;
    const radius = radiusForCount(count);
    const reservRings = reservationRingsForRadius(radius);
    const color = emotionColorMap[stackDots[0].emotion as keyof typeof emotionColorMap];

    const [u, v] = stackDots[0].coords;
    const rawX = (u - 0.5) * planeWidth;
    const rawY = (v - 0.5) * planeHeight;

    const [worldX, worldY] = findAndOccupyHexPoint(
      rawX,
      rawY,
      HEX_CELL_SIZE,
      occupiedHexPoints,
      reservRings
    );

    const worldZ = sampleWorldZ(worldX, worldY);

    // ── Solid inner sphere ───────────────────────────────────────────────────
    // 8×8 segments so the wireframe shell has clean, readable edges
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 8),
      new THREE.MeshStandardMaterial({ color })
    );

    sphere.position.set(worldX, worldZ + DOT_Z_OFFSET + radius, -worldY);
    sphere.userData = {
      ...stackDots[0],
      id: `${stackDots[0].locationName}-${stackDots[0].emotion}`,
      count,
    };
    sphere.name = "map-dot";

    // ── Wireframe shell ──────────────────────────────────────────────────────
    const wireMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * WIREFRAME_RADIUS_SCALE, 8, 8),
      new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: WIREFRAME_OPACITY,
      })
    );

    // Disable raycasting on the shell so hover/click always hit the solid
    // sphere beneath it, which carries the correct userData and name.
    wireMesh.raycast = () => { };

    sphere.add(wireMesh);

    // ── Label ────────────────────────────────────────────────────────────────
    const labelDiv = document.createElement('div');
    labelDiv.textContent = count > 1
      ? `${stackDots[0].locationName} (${stackDots[0].emotion}, ${count})`
      : stackDots[0].locationName;
    labelDiv.style.color = 'white';
    labelDiv.style.fontSize = '10px';
    labelDiv.style.fontFamily = 'sans-serif';
    labelDiv.style.padding = '0px 4px';
    labelDiv.style.background = 'rgba(0, 0, 0, 0.75)';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.whiteSpace = 'nowrap';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.userSelect = 'none';
    labelDiv.style.visibility = 'hidden';

    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(0, radius + 1.5, 0);
    labelObject.name = "dot-label";
    sphere.add(labelObject);

    group.add(sphere);
  });

  return group;
};

export const getClickedDot = (
  event: MouseEvent,
  camera: THREE.Camera,
  dotsGroup: THREE.Group
) => {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dotsGroup.children, true);

  return intersects.length > 0 ? intersects[0].object : null;
};