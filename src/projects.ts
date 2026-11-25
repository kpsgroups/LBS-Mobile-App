import AsyncStorage from "@react-native-async-storage/async-storage";
import { finishes } from "./materials";
import { designLimits, furniture, type Design } from "./model";

export interface Project {
  id: string;
  name: string;
  estimate: string;
  design: Design;
  updated: string;
}
const key = "lbs.projects.v1";
function isProject(item: unknown): item is Project {
  if (!item || typeof item !== "object") return false;
  const p = item as Partial<Project>,
    d = p.design;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.estimate === "string" &&
    typeof p.updated === "string" &&
    Number.isFinite(Date.parse(p.updated)) &&
    !!d &&
    (d.kind === undefined || Object.prototype.hasOwnProperty.call(furniture, d.kind)) &&
    Object.entries(designLimits(d)).every(([field, [min, max]]) => {
      const n = d[field as "width" | "height" | "depth" | "bays"];
      return Number.isInteger(n) && n >= min && n <= max;
    }) &&
    ["Mixed", "Shelves", "Hanging"].includes(d.layout) &&
    finishes.some((f) => f.id === d.finish) &&
    [d.accent, d.detail].every((id) => id === undefined || finishes.some((f) => f.id === id))
  );
}
export async function readProjects(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isProject))
    throw new Error("Invalid project data");
  return value;
}
export async function saveProject(project: Project) {
  const projects = await readProjects();
  const next = [project, ...projects.filter((p) => p.id !== project.id)];
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}
