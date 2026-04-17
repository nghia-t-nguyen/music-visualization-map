import * as THREE from "three";
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { type Dot } from '../../../data/geographicData';
import { DOT_Z_OFFSET } from "../../../constants";

interface DotParams {
  campusImage: HTMLImageElement;
  topologyDispImage: HTMLImageElement;
  campusScale: number;
  topologyScale: number;
  planeWidth: number;
  planeHeight: number;
  dots: Dot[]
}

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
  const intersects = raycaster.intersectObjects(dotsGroup.children);

  return intersects.length > 0 ? intersects[0].object as THREE.Mesh : null;
};

export const createMapDots = ({
  campusImage,
  topologyDispImage,
  campusScale,
  topologyScale,
  planeWidth,
  planeHeight,
  dots
}: DotParams) => {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return group;

  const getVal = (img: HTMLImageElement, u: number, v: number) => {
    canvas.width = 1;
    canvas.height = 1;
    ctx.drawImage(img, u * img.width, (1 - v) * img.height, 1, 1, 0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[0] / 255;
  };

  dots.forEach((dotData, index) => {
    const [u, v] = dotData.coords;
    const h1 = getVal(campusImage, u, v);
    const h2 = getVal(topologyDispImage, u, v);

    const worldZ = (h1 * campusScale) + (h2 * topologyScale);
    const worldX = (u - 0.5) * planeWidth;
    const worldY = (v - 0.5) * planeHeight;

    // Create the Dot Mesh
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000 })
    );

    dot.position.set(worldX, worldZ + DOT_Z_OFFSET, -worldY);
    dot.userData = { ...dotData, id: index };
    dot.name = "map-dot";

    const labelDiv = document.createElement('div');
    labelDiv.textContent = dotData.locationName;
    labelDiv.style.color = 'white';
    labelDiv.style.fontSize = '10px';
    labelDiv.style.fontFamily = 'sans-serif';
    labelDiv.style.padding = '0px 4px';
    labelDiv.style.background = 'rgba(0, 0, 0, 0.75)';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.whiteSpace = 'nowrap';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.userSelect = 'none';
    labelDiv.style.visibility = 'hidden'; // ← hidden by default

    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(0, 3, 0);
    labelObject.name = "dot-label"; // ← name it for easy lookup
    dot.add(labelObject);

    group.add(dot);
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
  const intersects = raycaster.intersectObjects(dotsGroup.children);

  return intersects.length > 0 ? intersects[0].object : null;
};
