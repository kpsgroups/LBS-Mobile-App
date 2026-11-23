import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { decode } from "jpeg-js";
import { toByteArray } from "base64-js";

// Rank candidate footprints in the visible crop. Local contrast penalizes
// busy or obstructed areas. This is a visual suggestion without depth sensing.
export async function suggestPlacement(uri: string, frame: {width:number;height:number}) {
  const thumb = await manipulateAsync(uri,[{resize:{width:144}}],{format:SaveFormat.JPEG,base64:true});
  const {width,height,data} = decode(toByteArray(thumb.base64!),{useTArray:true});
  const zoom = Math.max(frame.width/width,frame.height/height);
  const cw=frame.width/zoom, ch=frame.height/zoom;
  const ox=(width-cw)/2, oy=(height-ch)/2;
  function luma(x:number,y:number) {
    const i=4*(Math.min(height-1,Math.max(0,Math.round(oy+y*ch)))*width+Math.min(width-1,Math.max(0,Math.round(ox+x*cw))));
    return data[i]*0.299+data[i+1]*0.587+data[i+2]*0.114;
  }
  let best=Infinity, point={x:0.5,y:0.58};
  for(const x of [0.5,0.35,0.65]) for(const y of [0.54,0.62,0.70]) {
    let score=Math.abs(x-0.5)*6+Math.abs(y-0.62)*8;
    for(let i=-3;i<=3;i++) for(let j=-3;j<=3;j++) {
      const u=x+i*0.045,v=y+j*0.05;
      score+=(Math.abs(luma(u,v)-luma(u+0.018,v))+Math.abs(luma(u,v)-luma(u,v+0.018)))/49;
    }
    if(score<best) {best=score;point={x,y};}
  }
  return point;
}
