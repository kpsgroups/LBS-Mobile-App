import type * as Three from "three";
import type { Part } from "./model";

// three.js geometry for a part: a box, or its outline extruded along Z with the
// texture spread over the whole shape (matching ViroPolygon and the SVG preview).
export function partGeometry(three: typeof Three, part: Part) {
  const [w, h, d] = part.size.map((v) => Math.max(v, 0.0005));
  if (!part.outline) return new three.BoxGeometry(w, h, d);
  const shape = new three.Shape(part.outline.map(([x, y]) => new three.Vector2(x, y)));
  const geometry = new three.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, -d / 2);
  const position = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + w / 2) / w, (position.getY(i) + h / 2) / h);
  return geometry;
}
