import * as THREE from "three";
import { DOT_Z_OFFSET } from "../../constants";

interface DotParams {
  dots: number[][];
  campusImage: HTMLImageElement;
  topologyDispImage: HTMLImageElement;
  campusScale: number;
  topologyScale: number;
  planeWidth: number;
  planeHeight: number;
}

export const createMapDots = ({
  dots,
  campusImage,
  topologyDispImage,
  campusScale,
  topologyScale,
  planeWidth,
  planeHeight,
}: DotParams) => {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return group;

  const getVal = (img: HTMLImageElement, u: number, v: number) => {
    canvas.width = 1;
    canvas.height = 1;
    // (1-v) flips the coordinate to match texture space
    ctx.drawImage(img, u * img.width, (1 - v) * img.height, 1, 1, 0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[0] / 255;
  };

  dots.forEach(([u, v], index) => { // Add index here
    const h1 = getVal(campusImage, u, v);
    const h2 = getVal(topologyDispImage, u, v);

    const worldZ = (h1 * campusScale) + (h2 * topologyScale);
    const worldX = (u - 0.5) * planeWidth;
    const worldY = (v - 0.5) * planeHeight;

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000 })
    );

    dot.position.set(worldX, worldZ + 0.5, -worldY);

    // Add metadata to the mesh for identification later
    dot.userData = { id: index, coords: [u, v] };
    dot.name = "map-dot"; // Helpful for filtering in raycasting

    group.add(dot);
  });

  return group;
};
