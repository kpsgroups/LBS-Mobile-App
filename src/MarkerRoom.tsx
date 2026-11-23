import React, {useEffect,useState} from "react";
import { Linking, Platform, View, useWindowDimensions } from "react-native";
import {Camera} from "expo-camera";
import {finishById} from "./materials";
import type {Design} from "./model";
import {markerPage} from "./markerPage";
import {markerTexture} from "./markerTexture";
import MarkerSurface from "./MarkerSurface";
import {Button,T,s} from "./ui";

const pdf="https://raw.githubusercontent.com/kpsgroups/LBS-Mobile-App/v0.1.4/public/LBS-floor-marker.pdf";
export default function MarkerRoom({design,close}:{design:Design;close:()=>void}) {
  const [html,setHtml]=useState(""),[message,setMessage]=useState(""),[opening,setOpening]=useState(false);
  const height=useWindowDimensions().height;
  const active=React.useRef(true);
  useEffect(()=>{active.current=true;return ()=>{active.current=false;};},[]);
  async function start(){
    setOpening(true);setMessage("");
    try {
      if(Platform.OS!=="web"){
        const p=await Camera.requestCameraPermissionsAsync();
        if(!p.granted){if(active.current)setMessage("Allow Camera in the LBS app permissions, then try again.");return;}
      }
      const texture=await markerTexture(finishById(design.finish).image).catch(()=>"");
      if(active.current)setHtml(markerPage(design,texture));
    }catch{if(active.current)setMessage("The camera could not start. Check its permission and try again.");}
    finally{if(active.current)setOpening(false);}
  }
  return <View style={s.section}>
    <T style={s.h2}>Floor marker placement</T>
    <T style={s.sub}>Print the LBS marker on A4 at 100%. Lay it flat just in front of the furniture location, with TOP pointing toward the back of the design.</T>
    <Button secondary onPress={()=>{void Linking.openURL(pdf).catch(()=>setMessage("Open the LBS floor marker PDF from the GitHub release."));}}>Open printable marker</Button>
    {html ? <>
      <View style={{height:Math.min(620,height*.58),overflow:"hidden"}}><MarkerSurface html={html}/></View>
      <T style={s.sub}>Keep all four corners visible as you move. The model reappears when the camera finds the marker again.</T>
      <Button secondary onPress={()=>setHtml("")}>Stop marker camera</Button>
    </> : <Button disabled={opening} onPress={start}>{opening?"Opening camera…":"Start marker camera"}</Button>}
    {!!message && <T accessibilityRole="alert">{message}</T>}
    <Button secondary onPress={close}>Use camera &amp; photo placement</Button>
  </View>;
}
