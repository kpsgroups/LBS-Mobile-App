// Bundled into a local camera surface. All frames are processed on the device.
import { AR } from "js-aruco2/src/aruco";
import { POS } from "js-aruco2/src/posit1";

const video = document.querySelector("video");
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const scan = document.createElement("canvas");
const reader = scan.getContext("2d", {willReadFrequently:true});
const status = document.querySelector("output");
const detector = new AR.Detector({dictionaryName:"ARUCO_MIP_36h12",maxHammingDistance:2});
const {parts, depth, color, texture} = window.roomDesign;
const finish = new Image();
if(texture) finish.src = texture;
const surfaces = {finish:color,hardware:"#746c61",plinth:"#52483d",interior:"#ceb99b"};
const faces = [
  [0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]
];
let stream, timer, stopped=false, solver, focal, lastSeen=0, lastCorners;
const boxes = parts.map(part => {
  const vertices = Array.from({length:8},(_,i) => {
    const [x,y,z]=part.center.map((c,k)=>c+((i & (1<<k))?1:-1)*part.size[k]/2);
    // Marker +Y points toward the back of the design. POS camera Z points away.
    return [x,depth/2+0.15-z,-y];
  });
  return {vertices, surface:part.surface};
});
function triangle(image, points, source) {
  const [p,q,r]=points, [a,b,c]=source;
  const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
  const coeff = k=>[((q[k]-p[k])*(c[1]-a[1])-(r[k]-p[k])*(b[1]-a[1]))/det,
    ((r[k]-p[k])*(b[0]-a[0])-(q[k]-p[k])*(c[0]-a[0]))/det];
  const [xx,xy]=coeff(0),[yx,yy]=coeff(1);
  context.save();context.beginPath();context.moveTo(...p);context.lineTo(...q);context.lineTo(...r);context.closePath();context.clip();
  context.transform(xx,yx,xy,yy,p[0]-xx*a[0]-xy*a[1],p[1]-yx*a[0]-yy*a[1]);context.drawImage(image,0,0);context.restore();
}
function drawModel(pose) {
  const rot=pose.bestRotation, trans=pose.bestTranslation, polygons=[];
  for(const box of boxes){
    const projected=box.vertices.map(vertex=>{
      const [x,y,z]=rot.map((row,i)=>row.reduce((sum,v,j)=>sum+v*vertex[j],trans[i]));
      return [canvas.width/2+focal*x/z,canvas.height/2-focal*y/z,z];
    });
    for(let i=0;i<faces.length;i++){
      const points=faces[i].map(index=>projected[index]);
      if(points.some(p=>p[2]<0.04))continue;
      polygons.push({points:points.map(p=>p.slice(0,2)),z:points.reduce((a,p)=>a+p[2],0)/4,surface:box.surface,shade:[0.16,0,0.22,0.03,0.14,0.10][i]});
    }
  }
  for(const face of polygons.sort((a,b)=>b.z-a.z)){
    const [a,b,c,d]=face.points;context.beginPath();context.moveTo(...a);for(const p of [b,c,d])context.lineTo(...p);context.closePath();
    context.fillStyle=surfaces[face.surface];context.fill();
    if(face.surface==="finish" && finish.naturalWidth){
      const w=finish.naturalWidth,h=finish.naturalHeight;
      triangle(finish,[a,b,c],[[0,h],[w,h],[w,0]]);triangle(finish,[a,c,d],[[0,h],[w,0],[0,0]]);
    }
    context.beginPath();context.moveTo(...a);for(const p of [b,c,d])context.lineTo(...p);context.closePath();
    context.fillStyle="rgba(22,17,12,"+face.shade+")";context.fill();
  }
}
function frame(){
  if(stopped || document.hidden)return;
  if(video.readyState>=2 && video.videoWidth){
    const scale=Math.min(1,800/Math.max(video.videoWidth,video.videoHeight));
    const w=Math.round(video.videoWidth*scale),h=Math.round(video.videoHeight*scale);
    if(!solver || w!==canvas.width || h!==canvas.height){
      canvas.width=scan.width=w;canvas.height=scan.height=h;focal=Math.max(w,h)*0.92;
      solver=new POS.Posit(0.18,focal);lastCorners=undefined;
    }
    reader.drawImage(video,0,0,w,h);context.drawImage(scan,0,0);
    const mark=detector.detect(reader.getImageData(0,0,w,h)).find(m=>m.id===17);
    if(mark){
      const now=performance.now();
      const corners=mark.corners.map(({x,y},i)=>{
        const prev=now-lastSeen<180 && lastCorners?.[i];
        return prev ? {x:x*.82+prev.x*.18,y:y*.82+prev.y*.18} : {x,y};
      });
      lastCorners=corners;lastSeen=now;
      const pose=solver.pose(corners.map(p=>({x:p.x-w/2,y:h/2-p.y})));
      if(Number.isFinite(pose.bestError) && pose.bestError>=0 && pose.bestTranslation[2]>0){
        drawModel(pose);status.textContent="Tracking floor marker";status.dataset.tracking="true";
      }
    } else {
      status.dataset.tracking="false";status.textContent=lastSeen?"Bring the whole marker back into view":"Point at the printed LBS floor marker";
    }
  }
  timer=window.setTimeout(frame,40);
}
function stop(){stopped=true;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());}
async function open(){
  try {
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
    if(stopped){stop();return;}
    video.srcObject=stream;await video.play();frame();
  } catch {stop();status.textContent="Camera unavailable. Check camera permission, then reopen marker tracking.";}
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)clearTimeout(timer);else if(!stopped)frame();});
window.addEventListener("pagehide",stop);window.stopMarkerCamera=stop;
open();
