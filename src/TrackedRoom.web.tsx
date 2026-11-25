import React, { useEffect, useRef, useState } from "react";
import { Asset } from "expo-asset";
import { View } from "react-native";
import { furnitureParts, type Design } from "./model";
import { finishById } from "./materials";
import { Button, T, s } from "./ui";
import { footprintOutline, formatSize, yawToward } from "./arPlacement";

// On-screen hint and exit button shown over the camera when the browser supports DOM overlay.
function overlay() {
  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;font:15px system-ui;color:#fff";
  const hint = document.createElement("div");
  hint.style.cssText = "position:absolute;left:50%;bottom:28px;transform:translateX(-50%);max-width:88vw;text-align:center;background:#20231cd0;padding:10px 14px;border-radius:10px";
  const exit = document.createElement("button");
  exit.textContent = "Close";
  exit.style.cssText = "position:absolute;right:14px;top:14px;pointer-events:auto;font:600 15px system-ui;padding:12px 18px;border:0;border-radius:24px;background:#fffef9;color:#292923";
  exit.addEventListener("beforexrselect", (event) => event.preventDefault());
  root.append(hint, exit);
  document.body.append(root);
  return { root, hint, exit };
}

export default function TrackedRoom({ design, close }: { design: Design; close: () => void }) {
  const session = useRef<XRSession | null>(null);
  const mounted = useRef(true);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking live AR support…");
  useEffect(() => {
    mounted.current = true;
    Promise.resolve(navigator.xr?.isSessionSupported("immersive-ar")).catch(() => false).then((ok) => {
      if (mounted.current) {
        setSupported(!!ok);
        setMessage(ok ? "Aim at the floor, check the outline of the real footprint, then tap to place. Tap again to move it." : "This browser cannot run AR. Install the LBS Android app on an AR-capable phone for full-size AR, or use Chrome on Android.");
      }
    });
    return () => { mounted.current = false; void session.current?.end().catch(() => {}); };
  }, []);
  async function start() {
    if (!navigator.xr || busy) return;
    setBusy(true);
    let xr: XRSession | undefined;
    const ui = overlay();
    try {
      xr = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"], optionalFeatures: ["anchors", "dom-overlay", "light-estimation"], domOverlay: { root: ui.root } } as XRSessionInit);
      if (!mounted.current) { await xr.end(); ui.root.remove(); return; }
      session.current = xr;
      const current = xr;
      ui.exit.onclick = () => void current.end().catch(() => {});
      ui.hint.textContent = "Move the phone slowly and point at the floor.";
      const three = await import("three");
      const renderer = new three.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFSoftShadowMap;
      const scene = new three.Scene(), camera = new three.PerspectiveCamera(), model = new three.Group(), reticle = new three.Group();
      let source: XRHitTestSource | undefined, anchor: XRAnchor | undefined, ended = false;
      const disposables: { dispose: () => void }[] = [];
      const finish = finishById(design.finish);
      const texture = new three.TextureLoader().load(Asset.fromModule(finish.image).uri);
      texture.colorSpace = three.SRGBColorSpace;
      const materials = {
        finish: new three.MeshStandardMaterial({ map: texture, roughness: 0.57 }),
        interior: new three.MeshStandardMaterial({ color: 0xcfb596 }),
        hardware: new three.MeshStandardMaterial({ color: 0x756b62, metalness: 0.4 }),
        plinth: new three.MeshStandardMaterial({ color: 0x54473b }),
      };
      const outlineMaterial = new three.MeshBasicMaterial({ color: 0xffffff });
      const fillMaterial = new three.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
      const shadowMaterial = new three.ShadowMaterial({ opacity: 0.32 });
      disposables.push(texture, ...Object.values(materials), outlineMaterial, fillMaterial, shadowMaterial);
      function box(size: [number, number, number], material: InstanceType<typeof three.Material>) {
        const geometry = new three.BoxGeometry(...size);
        disposables.push(geometry);
        return new three.Mesh(geometry, material);
      }
      xr.addEventListener("end", () => {
        ended = true; source?.cancel(); anchor?.delete(); renderer.setAnimationLoop(null);
        renderer.dispose(); disposables.forEach((d) => d.dispose()); ui.root.remove(); session.current = null;
        if (mounted.current) setBusy(false);
      }, { once: true });
      for (const part of furnitureParts(design)) {
        const mesh = box(part.size, materials[part.surface]);
        mesh.position.set(...part.center); mesh.castShadow = true; model.add(mesh);
      }
      const w = design.width / 1000, d = design.depth / 1000, h = design.height / 1000;
      const floor = new three.PlaneGeometry(w + 1.2, d + 1.2);
      disposables.push(floor);
      const shadow = new three.Mesh(floor, shadowMaterial);
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; shadow.receiveShadow = true; model.add(shadow);
      for (const edge of footprintOutline(design)) {
        const mesh = box(edge.size, outlineMaterial); mesh.position.set(...edge.center); reticle.add(mesh);
      }
      const fillGeometry = new three.PlaneGeometry(w, d);
      disposables.push(fillGeometry);
      const fill = new three.Mesh(fillGeometry, fillMaterial);
      fill.rotation.x = -Math.PI / 2; fill.position.y = 0.002; reticle.add(fill);
      model.visible = reticle.visible = false; model.matrixAutoUpdate = reticle.matrixAutoUpdate = false;
      scene.add(model, reticle);
      scene.add(new three.HemisphereLight(0xfff6e7, 0x958e83, 2));
      const light = new three.DirectionalLight(0xffffff, 2);
      light.position.set(0.6, h + 2, 1.2); light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      Object.assign(light.shadow.camera, { left: -w, right: w, top: w, bottom: -w, near: 0.1, far: h + 5 });
      light.target = model; model.add(light);
      renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local");
      await renderer.xr.setSession(xr);
      const viewer = await xr.requestReferenceSpace("viewer");
      source = await xr.requestHitTestSource?.({ space: viewer, entityTypes: ["plane"] });
      if (!source) throw Error("No floor detection");
      // Latest floor point under the screen centre, oriented to face the viewer.
      let target: { position: DOMPointReadOnly; yaw: number } | null = null;
      const turn = new three.Quaternion(), up = new three.Vector3(0, 1, 0), one = new three.Vector3(1, 1, 1), at = new three.Vector3();
      function compose(matrix: InstanceType<typeof three.Matrix4>, position: DOMPointReadOnly, yaw: number) {
        turn.setFromAxisAngle(up, (yaw * Math.PI) / 180);
        matrix.compose(at.set(position.x, position.y, position.z), turn, one);
      }
      // A tap places the model at the outline. The next tap picks it up again to move it.
      xr.addEventListener("select", () => {
        const space = renderer.xr.getReferenceSpace();
        if (ended || !space) return;
        anchor?.delete(); anchor = undefined;
        if (model.visible) { model.visible = false; return; }
        if (!target) return;
        const placement = target;
        compose(model.matrix, placement.position, placement.yaw); model.matrixWorldNeedsUpdate = true;
        model.visible = true;
        ui.hint.textContent = "Walk around to see every side. Tap to pick it up and move it.";
        const half = (placement.yaw * Math.PI) / 360;
        const transform = new XRRigidTransform(placement.position, { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
        renderer.xr.getFrame()?.createAnchor?.(transform, space)
          ?.then((value) => { if (ended || !model.visible || anchor) value.delete(); else anchor = value; })
          .catch(() => {});
      });
      renderer.setAnimationLoop((_time, frame) => {
        const space = renderer.xr.getReferenceSpace();
        if (!frame || !space || !source) return;
        const view = frame.getViewerPose(space);
        if (!view) { reticle.visible = false; return; }
        target = null;
        if (!model.visible) {
          for (const hit of frame.getHitTestResults(source)) {
            const hitPose = hit.getPose(space);
            if (!hitPose || hitPose.transform.matrix[5] < 0.94 || hitPose.transform.position.y > view.transform.position.y - 0.3) continue;
            const p = hitPose.transform.position, v = view.transform.position;
            target = { position: p, yaw: yawToward([p.x, p.y, p.z], [v.x, v.y, v.z]) };
            break;
          }
          if (target) { compose(reticle.matrix, target.position, target.yaw); reticle.matrixWorldNeedsUpdate = true; }
          const text = target ? `The outline shows the real footprint (${formatSize(design)}). Tap to place.` : "Point at the floor where the furniture should stand.";
          if (ui.hint.textContent !== text) ui.hint.textContent = text;
        } else if (anchor) {
          const anchored = frame.getPose(anchor.anchorSpace, space);
          if (anchored) { model.matrix.fromArray(anchored.transform.matrix); model.matrixWorldNeedsUpdate = true; }
        }
        reticle.visible = !!target;
        renderer.render(scene, camera);
      });
    } catch {
      ui.root.remove();
      await xr?.end().catch(() => {});
      if (mounted.current) { setBusy(false); setMessage("Live AR could not start. Check camera permission, retry, or use a room photo."); }
    }
  }
  return <View style={s.section}><T style={s.h2}>Walk around in 3D</T><T style={s.sub}>{message}</T>
    {supported && <Button disabled={busy} onPress={start}>Start live AR</Button>}
    <Button secondary onPress={close}>Use camera &amp; photo placement</Button></View>;
}
