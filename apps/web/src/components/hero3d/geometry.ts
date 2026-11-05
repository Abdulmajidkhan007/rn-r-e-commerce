import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * All decor models are built from code (no downloaded assets, nothing to
 * license). Built by hand instead of `Shape` + `ExtrudeGeometry` because those
 * pull the curve/triangulation modules (~7 KB gzip) into the 3D chunk.
 */

type Point = readonly [number, number];

/**
 * Extrudes a polygon that is star-shaped around the origin (every vertex is
 * visible from (0, 0)), so a triangle fan triangulates both caps. The result is
 * non-indexed, which gives flat, low-poly normals.
 */
function extrudeRadialPolygon(outline: readonly Point[], depth: number): BufferGeometry {
  const half = depth / 2;
  const positions: number[] = [];
  const push = (...vertices: readonly (readonly [number, number, number])[]): void => {
    for (const v of vertices) positions.push(v[0], v[1], v[2]);
  };
  outline.forEach(([x1, y1], i) => {
    const next = outline[(i + 1) % outline.length];
    if (!next) return;
    const [x2, y2] = next;
    push([0, 0, half], [x1, y1, half], [x2, y2, half]); // front cap
    push([0, 0, -half], [x2, y2, -half], [x1, y1, -half]); // back cap
    push([x1, y1, half], [x1, y1, -half], [x2, y2, half]); // side quad
    push([x2, y2, half], [x1, y1, -half], [x2, y2, -half]);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Five-point star with outer radius 1, centered on the origin. */
export function createStarGeometry(points = 5, inner = 0.48, depth = 0.32): BufferGeometry {
  const outline: Point[] = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? 1 : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
  return extrudeRadialPolygon(outline, depth);
}
