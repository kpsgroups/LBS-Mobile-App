import React from "react";
import { View } from "react-native";
import Svg, { Ellipse, G, Image as Texture, Polygon } from "react-native-svg";
import { furnitureParts, furnitureName, type Design, type Part, type Triple } from "./model";
import { finishById } from "./materials";

// Orthographic projection of the same metre-scale boxes used in AR.
// Map the scan onto the front plane so grain follows each door as it turns.
export function Preview({
  design,
  open = false,
  angle = 24,
  overlay = false,
  height = 240,
}: {
  design: Design;
  open?: boolean;
  angle?: number;
  overlay?: boolean;
  height?: number;
}) {
  const rad = (angle * Math.PI) / 180,
    yaw = Math.cos(rad),
    side = Math.sin(rad);
  const pitch = 0.15,
    tilt = Math.sin(pitch),
    rise = Math.cos(pitch);
  const w = design.width / 1000,
    h = design.height / 1000,
    d = design.depth / 1000;
  const footprint = w * yaw + d * Math.abs(side);
  const scale = Math.min(
    272 / footprint,
    196 / (h * rise + (w * Math.abs(side) + d * yaw) * tilt),
  );
  function project([x, y, z]: Triple) {
    return [
      160 + scale * (x * yaw - z * side),
      120 + scale * (-(y - h / 2) * rise + (x * side + z * yaw) * tilt),
    ];
  }
  const finish = finishById(design.finish);
  const parts = furnitureParts(design, open);
  function layer(p: Part) {
    if (p.id === "back") return -100;
    if (p.id === "top") return 80;
    if (p.id.startsWith("door")) return 90;
    if (p.id.startsWith("pull")) return 100;
    if (p.id === "recessed base") return -110;
    return p.center[0] * side + p.center[2] * yaw + p.center[1] * tilt;
  }
  parts.sort((a, b) => layer(a) - layer(b));
  return (
    <View
      accessibilityLabel={
        furnitureName(design) + " preview, " + finish.name
      }
      style={{
        backgroundColor: overlay ? "transparent" : "#eeeae0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Svg width="100%" height={height} viewBox="0 0 320 240">
        {!overlay && (
          <Ellipse
            cx={160}
            cy={122 + (h * rise * scale) / 2}
            rx={footprint * scale * 0.53}
            ry={7}
            fill="#c8c4b9"
          />
        )}
        {parts.map((p) => {
          const [x, y, z] = p.center,
            [hw, hh, hd] = p.size.map((v) => v / 2);
          const left = x - hw,
            right = x + hw,
            top = y + hh,
            bottom = y - hh,
            front = z + hd,
            back = z - hd;
          const edge = side > 0 ? right : left;
          const faces: Triple[][] = [
            [
              [edge, top, front],
              [edge, top, back],
              [edge, bottom, back],
              [edge, bottom, front],
            ],
            [
              [left, top, back],
              [right, top, back],
              [right, top, front],
              [left, top, front],
            ],
            [
              [left, top, front],
              [right, top, front],
              [right, bottom, front],
              [left, bottom, front],
            ],
          ];
          const base = {
            finish: finish.color,
            interior: "#cfb596",
            hardware: "#554538",
            plinth: "#574a3f",
          }[p.surface];
          return (
            <G key={p.id}>
              {faces.map((face, index) => {
                const [a, b, c, e] = face.map(project);
                const points = [a, b, c, e].map((v) => v.join(",")).join(" ");
                return (
                  <G key={index}>
                    <Polygon points={points} fill={base} />
                    {index === 2 && p.surface === "finish" && (
                      <Texture
                        href={finish.image}
                        width={1}
                        height={1}
                        preserveAspectRatio="none"
                        transform={`matrix(${b[0] - a[0]} ${b[1] - a[1]} ${e[0] - a[0]} ${e[1] - a[1]} ${a[0]} ${a[1]})`}
                      />
                    )}
                    {index < 2 && (
                      <Polygon
                        points={points}
                        fill={index === 0 ? "#282821" : "#ffffff"}
                        opacity={index === 0 ? 0.2 : 0.13}
                      />
                    )}
                    <Polygon
                      points={points}
                      stroke="#493c30"
                      strokeOpacity={0.35}
                      strokeWidth={0.4}
                      fill="none"
                    />
                  </G>
                );
              })}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
