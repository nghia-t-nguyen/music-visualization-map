import * as THREE from "three";

// ---------------------------------------------------------------------------
// Marching-squares helpers
// ---------------------------------------------------------------------------

/**
 * Sample a grayscale image into a 2-D Float32Array (values 0–1).
 * field[row * gridW + col] corresponds to UV (col/(gridW-1), row/(gridH-1)).
 * Mirrors the dots util: samples at (1 - v) in image space so that
 * UV v=0 (bottom) correctly maps to the bottom of the image.
 */
function sampleHeightField(
  image: HTMLImageElement,
  gridW: number,
  gridH: number
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d")!;

  // Flip vertically so that canvas row 0 = UV v=1 (top of image),
  // and canvas row (gridH-1) = UV v=0 (bottom of image).
  // After this transform, reading pixels top-to-bottom gives v from 1→0,
  // which matches (1 - v) sampling used in the dots util.
  ctx.translate(0, gridH);
  ctx.scale(1, -1);
  ctx.drawImage(image, 0, 0, gridW, gridH);

  const pixels = ctx.getImageData(0, 0, gridW, gridH).data;
  const field = new Float32Array(gridW * gridH);

  for (let row = 0; row < gridH; row++) {
    // canvas row 0 → v=0 (bottom), canvas row gridH-1 → v=1 (top)
    // because we flipped: canvas pixel [row] = image pixel [gridH-1-row]
    // which equals sampling at v = row / (gridH - 1) ✓
    for (let col = 0; col < gridW; col++) {
      const idx = (row * gridW + col) * 4;
      field[row * gridW + col] = pixels[idx] / 255;
    }
  }
  return field;
}

/**
 * Separable Gaussian blur on a Float32Array height field.
 * `radius` controls kernel half-width — larger = smoother flat areas.
 */
function smoothField(
  field: Float32Array,
  gridW: number,
  gridH: number,
  radius: number
): Float32Array {
  if (radius <= 0) return field;

  const sigma = radius / 2;
  const kSize = Math.ceil(radius) * 2 + 1;
  const kernel = new Float32Array(kSize);
  let kernelSum = 0;
  const half = Math.floor(kSize / 2);
  for (let i = 0; i < kSize; i++) {
    const x = i - half;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernelSum += kernel[i];
  }
  for (let i = 0; i < kSize; i++) kernel[i] /= kernelSum;

  const tmp = new Float32Array(gridW * gridH);
  const out = new Float32Array(gridW * gridH);

  // Horizontal pass
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      let val = 0;
      for (let k = 0; k < kSize; k++) {
        const sc = Math.min(Math.max(col + k - half, 0), gridW - 1);
        val += field[row * gridW + sc] * kernel[k];
      }
      tmp[row * gridW + col] = val;
    }
  }

  // Vertical pass
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      let val = 0;
      for (let k = 0; k < kSize; k++) {
        const sr = Math.min(Math.max(row + k - half, 0), gridH - 1);
        val += tmp[sr * gridW + col] * kernel[k];
      }
      out[row * gridW + col] = val;
    }
  }

  return out;
}

/** Linearly interpolate the crossing position along an edge (0–1). */
function lerp(a: number, b: number, threshold: number): number {
  if (Math.abs(b - a) < 1e-10) return 0.5;
  return (threshold - a) / (b - a);
}

interface Segment {
  x1: number; // 0–1 UV space
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Marching squares for a single threshold value.
 * Returns line segments in normalised UV space [0, 1].
 */
function marchingSquares(
  field: Float32Array,
  gridW: number,
  gridH: number,
  threshold: number
): Segment[] {
  const segments: Segment[] = [];

  const get = (col: number, row: number) => field[row * gridW + col];

  for (let row = 0; row < gridH - 1; row++) {
    for (let col = 0; col < gridW - 1; col++) {
      const tl = get(col, row);
      const tr = get(col + 1, row);
      const br = get(col + 1, row + 1);
      const bl = get(col, row + 1);

      const index =
        (tl >= threshold ? 8 : 0) |
        (tr >= threshold ? 4 : 0) |
        (br >= threshold ? 2 : 0) |
        (bl >= threshold ? 1 : 0);

      if (index === 0 || index === 15) continue;

      // UV of each corner
      const x0 = col / (gridW - 1);
      const x1 = (col + 1) / (gridW - 1);
      const y0 = row / (gridH - 1);
      const y1 = (row + 1) / (gridH - 1);

      // Interpolated edge midpoints (t values along each edge)
      const top = lerp(tl, tr, threshold);
      const right = lerp(tr, br, threshold);
      const bottom = lerp(bl, br, threshold);
      const left = lerp(tl, bl, threshold);

      // Edge UV positions
      const edgeTop = { x: x0 + top * (x1 - x0), y: y0 };
      const edgeRight = { x: x1, y: y0 + right * (y1 - y0) };
      const edgeBottom = { x: x0 + bottom * (x1 - x0), y: y1 };
      const edgeLeft = { x: x0, y: y0 + left * (y1 - y0) };

      // Lookup table: each case maps to one or two segments
      // Ambiguous cases (5, 10) use the average to decide saddle direction.
      const avg = (tl + tr + br + bl) / 4;

      switch (index) {
        case 1: segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeBottom.x, y2: edgeBottom.y }); break;
        case 2: segments.push({ x1: edgeBottom.x, y1: edgeBottom.y, x2: edgeRight.x, y2: edgeRight.y }); break;
        case 3: segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeRight.x, y2: edgeRight.y }); break;
        case 4: segments.push({ x1: edgeTop.x, y1: edgeTop.y, x2: edgeRight.x, y2: edgeRight.y }); break;
        case 5:
          if (avg >= threshold) {
            segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeTop.x, y2: edgeTop.y });
            segments.push({ x1: edgeBottom.x, y1: edgeBottom.y, x2: edgeRight.x, y2: edgeRight.y });
          } else {
            segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeBottom.x, y2: edgeBottom.y });
            segments.push({ x1: edgeTop.x, y1: edgeTop.y, x2: edgeRight.x, y2: edgeRight.y });
          }
          break;
        case 6: segments.push({ x1: edgeTop.x, y1: edgeTop.y, x2: edgeBottom.x, y2: edgeBottom.y }); break;
        case 7: segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeTop.x, y2: edgeTop.y }); break;
        case 8: segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeTop.x, y2: edgeTop.y }); break;
        case 9: segments.push({ x1: edgeTop.x, y1: edgeTop.y, x2: edgeBottom.x, y2: edgeBottom.y }); break;
        case 10:
          if (avg >= threshold) {
            segments.push({ x1: edgeTop.x, y1: edgeTop.y, x2: edgeRight.x, y2: edgeRight.y });
            segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeBottom.x, y2: edgeBottom.y });
          } else {
            segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeTop.x, y2: edgeTop.y });
            segments.push({ x1: edgeBottom.x, y1: edgeBottom.y, x2: edgeRight.x, y2: edgeRight.y });
          }
          break;
        case 11: segments.push({ x1: edgeTop.x, y1: edgeTop.y, x2: edgeRight.x, y2: edgeRight.y }); break;
        case 12: segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeRight.x, y2: edgeRight.y }); break;
        case 13: segments.push({ x1: edgeBottom.x, y1: edgeBottom.y, x2: edgeRight.x, y2: edgeRight.y }); break;
        case 14: segments.push({ x1: edgeLeft.x, y1: edgeLeft.y, x2: edgeBottom.x, y2: edgeBottom.y }); break;
      }
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ContourLinesOptions {
  /** The topology displacement image (the one that drives elevation). */
  topologyDispImage: HTMLImageElement;
  /** Displacement scale for topology (must match the shader). */
  topologyScale: number;
  /** Width of the Three.js plane in world units. */
  planeWidth: number;
  /** Height of the Three.js plane in world units. */
  planeHeight: number;
  /** Number of contour levels to draw (default: 10). */
  levels?: number;
  /** Colour of the contour lines (default: 0xffffff). */
  color?: number;
  /** Opacity of the contour lines (default: 0.35). */
  opacity?: number;
  /**
   * Resolution of the height-field grid used for marching squares.
   * Higher = more detail but more geometry (default: 256).
   */
  resolution?: number;
  /** Z-fighting offset above the terrain surface (default: 0.05). */
  zBias?: number;
  /**
   * Gaussian blur radius applied to the height field before marching squares.
   * Higher values calm down noisy/flat areas at the cost of contour sharpness.
   * 0 = no smoothing (default: 2).
   */
  smoothing?: number;
}

/**
 * Build a THREE.Group containing one THREE.LineSegments per contour level.
 * Both the isoline thresholds and the 3-D vertex positions are derived
 * exclusively from the topology displacement — campus displacement is
 * intentionally ignored so lines track terrain elevation only.
 */
export function createContourLines(opts: ContourLinesOptions): THREE.Group {
  const {
    topologyDispImage,
    topologyScale,
    planeWidth,
    planeHeight,
    levels = 10,
    color = 0xffffff,
    opacity = 0.35,
    resolution = 256,
    zBias = 0.05,
    smoothing = 4,
  } = opts;

  const gridW = resolution;
  const gridH = Math.round(resolution * (planeHeight / planeWidth));

  // Sample topology height field and smooth to suppress noise in flat areas
  const rawField = sampleHeightField(topologyDispImage, gridW, gridH);
  const topoField = smoothField(rawField, gridW, gridH, smoothing);

  // Contour thresholds evenly spaced in topology height (0–1)
  const thresholds: number[] = [];
  for (let i = 1; i < levels; i++) {
    thresholds.push(i / levels);
  }

  const group = new THREE.Group();
  // No group rotation — we build positions directly in world space
  // to match the dots util: position.set(worldX, worldZ, -worldY)

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  for (const threshold of thresholds) {
    const segments = marchingSquares(topoField, gridW, gridH, threshold);
    if (segments.length === 0) continue;

    const positions: number[] = [];

    // Every point on this isoline is at exactly `threshold` height —
    // no need to re-sample, just use the threshold directly for Y (world up).
    const isoWorldY = threshold * topologyScale + zBias;

    const uvToWorld = (u: number, v: number): [number, number, number] => {
      const worldX = (u - 0.5) * planeWidth;
      const worldY = (v - 0.5) * planeHeight;
      // Match dots: set(worldX, worldZ, -worldY)
      return [worldX, isoWorldY, -worldY];
    };

    for (const seg of segments) {
      const [x1, y1, z1] = uvToWorld(seg.x1, seg.y1);
      const [x2, y2, z2] = uvToWorld(seg.x2, seg.y2);
      positions.push(x1, y1, z1, x2, y2, z2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    group.add(new THREE.LineSegments(geometry, material));
  }

  return group;
}