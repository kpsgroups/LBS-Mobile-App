import { markerScript } from "./markerRuntime";
import { furnitureParts, type Design } from "./model";
import { finishById } from "./materials";

export function markerPage(design:Design, texture:string) {
  const data=JSON.stringify({parts:furnitureParts(design),depth:design.depth/1000,color:finishById(design.finish).color,texture}).replace(/</g,"\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src blob: mediastream:">
  <style>*{box-sizing:border-box}body{margin:0;background:#201e1b;color:white;font:15px system-ui}canvas{width:100vw;height:100vh;object-fit:contain}video{position:absolute;width:1px;height:1px;opacity:0}output{position:absolute;left:12px;bottom:12px;background:#20231cdb;padding:8px 12px;border-radius:6px}</style></head>
  <body><video autoplay playsinline muted></video><canvas></canvas><output>Opening rear camera…</output>
  <script>window.roomDesign=${data};</script><script>${markerScript.replace(/<\/script/gi,"<\\/script")}</script></body></html>`;
}
