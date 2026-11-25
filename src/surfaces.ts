import type { Design, FinishId, LaminateSurface, Surface } from "./model";

// Colours for surfaces that are not Meraki laminates, shared by the editor
// preview, native AR and WebXR so a design looks the same everywhere.
export const fixedSurfaces: Record<Exclude<Surface, LaminateSurface>, string> = {
  interior: "#cfb596",
  hardware: "#554538",
  plinth: "#574a3f",
  glow: "#ffd590", // warm LED strip
  mirror: "#b98a6a", // bronze-tinted mirror
  trim: "#c9a45c", // brushed gold profile
  screen: "#111316", // TV screen / black gloss top
};

export function isLaminate(surface: Surface): surface is LaminateSurface {
  return surface === "finish" || surface === "accent" || surface === "detail";
}

// The laminate a laminate surface uses; feature and detail fall back to the main finish.
export function laminateFor(design: Design, surface: LaminateSurface): FinishId {
  return (surface === "accent" ? design.accent : surface === "detail" ? design.detail : undefined) ?? design.finish;
}
