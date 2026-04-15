import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/**
 * Creates a minimalist compass overlay fixed to the lower-left corner.
 * Returns an update function to call each frame so the needle tracks the camera.
 */
export function createCompass(scene: THREE.Scene): {
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
} {
  // ── DOM ────────────────────────────────────────────────────────────────────
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    bottom: 28px;
    left: 28px;
    width: 56px;
    height: 56px;
    pointer-events: none;
    z-index: 100;
    margin-left: 10px;
  `;

  // Outer ring
  const ring = document.createElement("div");
  ring.style.cssText = `
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(20,20,20,0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  `;

  // Cardinal tick marks (N E S W)
  const cardinals: { label: string; deg: number }[] = [
    { label: "N", deg: 0 },
    { label: "E", deg: 90 },
    { label: "S", deg: 180 },
    { label: "W", deg: 270 },
  ];

  cardinals.forEach(({ label, deg }) => {
    const rad = (deg * Math.PI) / 180;
    const r = 22; // radius from centre for the tick/letter
    const cx = 28 + Math.sin(rad) * r;
    const cy = 28 - Math.cos(rad) * r;

    const span = document.createElement("span");
    span.textContent = label;
    span.style.cssText = `
      position: absolute;
      left: ${cx}px;
      top: ${cy}px;
      transform: translate(-50%, -50%);
      font-family: 'Courier New', monospace;
      font-size: ${label === "N" ? "9px" : "7px"};
      font-weight: ${label === "N" ? "700" : "400"};
      color: ${label === "N" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)"};
      letter-spacing: 0.04em;
      line-height: 1;
    `;
    ring.appendChild(span);
  });

  // Needle container (rotates each frame)
  const needleWrap = document.createElement("div");
  needleWrap.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
  `;

  // SVG needle — classic double-arrow, N tip red
  needleWrap.innerHTML = `
    <svg width="14" height="36" viewBox="0 0 14 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- North (up) — red -->
      <polygon points="7,1 11,18 7,15 3,18" fill="rgba(220,60,50,0.92)" />
      <!-- South (down) — white -->
      <polygon points="7,35 11,18 7,21 3,18" fill="rgba(255,255,255,0.55)" />
    </svg>
  `;

  // Centre dot
  const dot = document.createElement("div");
  dot.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,255,255,0.7);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `;

  ring.appendChild(needleWrap);
  ring.appendChild(dot);
  wrapper.appendChild(ring);

  // Attach directly to the document body — stays fixed, no CSS2DObject needed
  document.body.appendChild(wrapper);

  // ── Update ─────────────────────────────────────────────────────────────────
  // We derive the camera's yaw (rotation around world Y) to rotate the needle
  // so that the N tip always points toward world North (+Z in our scene).
  const _q = new THREE.Quaternion();
  const _euler = new THREE.Euler();

  function update(camera: THREE.Camera) {
    camera.getWorldQuaternion(_q);
    _euler.setFromQuaternion(_q, "YXZ");
    // Negate because rotating camera right should rotate compass needle left
    const yawDeg = THREE.MathUtils.radToDeg(_euler.y);
    needleWrap.style.transform = `rotate(${yawDeg}deg)`;
  }

  // ── Dispose ────────────────────────────────────────────────────────────────
  function dispose() {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }

  return { update, dispose };
}