// Renders catalog images for the feature walls, TV units, archways and designer
// wardrobes from the same parts the app shows in the editor and AR.
//   node --experimental-strip-types scripts/render-products.ts [product-key ...]
// Needs Playwright with Chromium (preinstalled in the cloud dev environment).
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { builders } from "../src/designs.ts";
import { furnitureParts, products, laminateSurfaces } from "../src/model.ts";
import { fixedSurfaces } from "../src/surfaces.ts";
import { partGeometry } from "../src/partGeometry.ts";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

// Finish ids -> image files, read from materials.ts without loading React Native.
const finishImages = new Map<string, string>();
for (const m of readFileSync(path.join(root, "src/materials.ts"), "utf8").matchAll(/\{ id: ("?)([^,"\n]+)\1, name:.*?require\("\.\.\/(assets\/finishes\/[^"]+)"\)/g))
  finishImages.set(m[2], m[3]);

const wanted = process.argv.slice(2);
const items = products.filter((p) => p.design.kind && p.design.kind in builders && (!wanted.length || wanted.includes(p.key)));

const html = `<!doctype html><html><head><style>html,body{margin:0;background:#000}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head>
<body><script type="module">
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
const partGeometry = ${partGeometry.toString()};
window.render = async ({ parts, size, textures, colors }) => {
  const [w, h, d] = size, W = 1200, H = 800;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.body.innerHTML = ""; document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#e9e3d8");
  const loader = new THREE.TextureLoader();
  const laminate = {};
  for (const [surface, url] of Object.entries(textures)) {
    const tex = await loader.loadAsync(url); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    laminate[surface] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  }
  const c = (k) => new THREE.Color(colors[k]);
  const mats = { ...laminate,
    interior: new THREE.MeshStandardMaterial({ color: c("interior"), roughness: 0.8 }),
    hardware: new THREE.MeshStandardMaterial({ color: c("hardware"), roughness: 0.5 }),
    plinth: new THREE.MeshStandardMaterial({ color: c("plinth"), roughness: 0.8 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd28a").multiplyScalar(2.2) }),
    mirror: new THREE.MeshStandardMaterial({ color: c("mirror"), metalness: 0.45, roughness: 0.15 }),
    trim: new THREE.MeshStandardMaterial({ color: c("trim"), metalness: 0.9, roughness: 0.28 }),
    screen: new THREE.MeshStandardMaterial({ color: c("screen"), roughness: 0.12, metalness: 0.2 }) };
  const group = new THREE.Group();
  for (const p of parts) {
    const mesh = new THREE.Mesh(partGeometry(THREE, p), mats[p.surface]);
    mesh.position.set(...p.center); mesh.castShadow = p.surface !== "glow"; mesh.receiveShadow = p.surface !== "glow";
    group.add(mesh);
  }
  scene.add(group);
  // Room: wall right behind the design and a pale floor.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, h + 3), new THREE.MeshStandardMaterial({ color: "#ebe5da", roughness: 0.95 }));
  wall.position.set(0, (h + 3) / 2 - 0.5, -d / 2 - 0.002); wall.receiveShadow = true; scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, 8), new THREE.MeshStandardMaterial({ color: "#d8cdbd", roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 4 - d / 2; floor.receiveShadow = true; scene.add(floor);
  scene.add(new THREE.HemisphereLight("#fffaf0", "#b8aa96", 1.25));
  const key = new THREE.DirectionalLight("#fff3e2", 1.6);
  key.position.set(w * 0.6 + 1.5, h + 2.5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -w, right: w, top: h + 1, bottom: -1, near: 0.5, far: 20 }); key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#e8eeff", 0.35); fill.position.set(-w - 2, h, 3); scene.add(fill);
  // Camera: three-quarter view from the right, framing the whole design.
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 60);
  const fit = Math.max(h / (2 * Math.tan(THREE.MathUtils.degToRad(16))), w / (2 * Math.tan(THREE.MathUtils.degToRad(16)) * (W / H))) * 1.16;
  camera.position.set(w * 0.22 + fit * 0.28, h * 0.5 + 0.1, d / 2 + fit * 0.96);
  camera.lookAt(0, h * 0.47, 0);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.5, 0.92));
  composer.addPass(new OutputPass());
  composer.render();
  return renderer.domElement.toDataURL("image/jpeg", 0.86);
};
window.ready = true;
</script></body></html>`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.route("http://render.local/**", async (route: any) => {
  const url = new URL(route.request().url());
  if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
  const file = url.pathname.startsWith("/three/") ? path.join(root, "node_modules", url.pathname) : path.join(root, url.pathname);
  const type = file.endsWith(".js") ? "text/javascript" : file.endsWith(".png") ? "image/png" : "image/jpeg";
  route.fulfill({ contentType: type, body: readFileSync(file) });
});
page.on("pageerror", (e: Error) => console.error("page error:", e.message));
await page.goto("http://render.local/");
await page.waitForFunction(() => (window as any).ready === true);

for (const item of items) {
  const d = item.design;
  const parts = furnitureParts(d);
  const used = new Set(parts.map((p) => p.surface));
  const textures: Record<string, string> = {};
  for (const surface of laminateSurfaces) {
    if (!used.has(surface)) continue;
    const id = String((surface === "accent" ? d.accent : surface === "detail" ? d.detail : undefined) ?? d.finish);
    const file = finishImages.get(id);
    if (!file) throw Error(`No image for finish ${id}`);
    textures[surface] = "/" + file;
  }
  const data: string = await page.evaluate((args: unknown) => (window as any).render(args), {
    parts, textures, colors: fixedSurfaces, size: [d.width / 1000, d.height / 1000, d.depth / 1000],
  });
  const out = path.join(root, "assets/products", item.key + ".jpg");
  writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
  console.log("rendered", item.key, parts.length, "parts");
}
await browser.close();
