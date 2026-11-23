import React from "react";
export default function MarkerSurface({html}:{html:string}) {
  return <iframe title="LBS floor marker camera" srcDoc={html} allow="camera" style={{border:0,width:"100%",height:"100%"}}/>;
}
