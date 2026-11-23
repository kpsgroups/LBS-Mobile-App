import React, { useEffect, useRef, useState } from "react";
import { Asset } from "expo-asset";
import { View } from "react-native";
import { furnitureParts, type Design } from "./model";
import { finishById } from "./materials";
import { Button, T, s } from "./ui";

export default function TrackedRoom({design, close}: {design:Design;close:()=>void}) {
  const session = useRef<XRSession | null>(null);
  const mounted = useRef(true);
  const [supported,setSupported] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("Checking live AR support…");
  useEffect(() => {
    mounted.current = true;
    Promise.resolve(navigator.xr?.isSessionSupported("immersive-ar")).catch(()=>false).then(ok=>{
      if (mounted.current) {
        setSupported(!!ok);
        setMessage(ok ? "Aim at clear floor space. Once the furniture appears, walk around it to see it from another angle." : "This browser has no live room tracking. Try the LBS Android app or use a room photo.");
      }
    });
    return () => {mounted.current=false; void session.current?.end().catch(()=>{});};
  },[]);
  async function start() {
    if (!navigator.xr || busy) return;
    setBusy(true);
    let xr: XRSession | undefined;
    try {
      xr = await navigator.xr.requestSession("immersive-ar",{requiredFeatures:["hit-test"], optionalFeatures:["anchors"]});
      if (!mounted.current) {await xr.end();return;}
      session.current=xr;
      const three=await import("three");
      const renderer=new three.WebGLRenderer({alpha:true,antialias:true});
      const scene=new three.Scene(), camera=new three.PerspectiveCamera(), model=new three.Group();
      let source: XRHitTestSource | undefined, anchor: XRAnchor | undefined, ended=false;
      const geometries: InstanceType<typeof three.BoxGeometry>[]=[];
      const finish=finishById(design.finish);
      const texture=new three.TextureLoader().load(Asset.fromModule(finish.image).uri);
      texture.colorSpace=three.SRGBColorSpace;
      const materials={
        finish:new three.MeshStandardMaterial({map:texture,roughness:0.57}),
        interior:new three.MeshStandardMaterial({color:0xcfb596}),
        hardware:new three.MeshStandardMaterial({color:0x756b62,metalness:0.4}),
        plinth:new three.MeshStandardMaterial({color:0x54473b})
      };
      xr.addEventListener("end",()=>{
        ended=true; source?.cancel();anchor?.delete();renderer.setAnimationLoop(null);
        renderer.dispose();texture.dispose();geometries.forEach(g=>g.dispose());
        Object.values(materials).forEach(m=>m.dispose());session.current=null;
        if(mounted.current)setBusy(false);
      },{once:true});
      for(const part of furnitureParts(design)){
        const geometry=new three.BoxGeometry(...part.size);
        geometries.push(geometry);
        const mesh=new three.Mesh(geometry,materials[part.surface]);mesh.position.set(...part.center);model.add(mesh);
      }
      model.visible=false;model.matrixAutoUpdate=false;scene.add(model);
      scene.add(new three.HemisphereLight(0xfff6e7,0x958e83,2));
      const light=new three.DirectionalLight(0xffffff,2);light.position.set(1,4,2);scene.add(light);
      renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType("local");
      await renderer.xr.setSession(xr);
      const viewer=await xr.requestReferenceSpace("viewer");
      source=await xr.requestHitTestSource?.({space:viewer,entityTypes:["plane"]});
      if(!source)throw Error("No floor detection");
      let locked=false;
      renderer.setAnimationLoop((_time,frame)=>{
        const space=renderer.xr.getReferenceSpace();
        if(!frame||!space||!source)return;
        const view=frame.getViewerPose(space);
        if(!view){model.visible=false;return;}
        if(!locked){
          for(const hit of frame.getHitTestResults(source)){
            const pose=hit.getPose(space);
            if(!pose || pose.transform.matrix[5]<0.94 || pose.transform.position.y>view.transform.position.y-0.45)continue;
            model.matrix.fromArray(pose.transform.matrix);model.matrixWorldNeedsUpdate=true;
            locked=true;
            frame.createAnchor?.(pose.transform,space)?.then(value=>{if(ended)value.delete();else anchor=value;}).catch(()=>{});
            break;
          }
        } else if(anchor) {
          const pose=frame.getPose(anchor.anchorSpace,space);
          if(pose){model.matrix.fromArray(pose.transform.matrix);model.matrixWorldNeedsUpdate=true;}
        }
        model.visible=locked;renderer.render(scene,camera);
      });
    } catch {
      await xr?.end().catch(()=>{});
      if(mounted.current){setBusy(false);setMessage("Live AR could not start. Check camera permission, retry, or use a room photo.");}
    }
  }
  return <View style={s.section}><T style={s.h2}>Walk around in 3D</T><T style={s.sub}>{message}</T>
    {supported && <Button disabled={busy} onPress={start}>Start live AR</Button>}
    <Button secondary onPress={close}>Use camera &amp; photo placement</Button></View>;
}
