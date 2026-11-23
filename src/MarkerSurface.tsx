import React from "react";
import { WebView } from "react-native-webview";
const origin="https://lbs-camera.invalid";
export default function MarkerSurface({html}:{html:string}) {
  return <WebView source={{html,baseUrl:origin+"/"}} originWhitelist={[origin,"about:blank"]}
    onShouldStartLoadWithRequest={({url})=>url==="about:blank" || url===origin+"/"}
    allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} scrollEnabled={false}
    allowFileAccess={false} />;
}
