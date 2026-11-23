import {Asset} from "expo-asset";
import {manipulateAsync,SaveFormat} from "expo-image-manipulator";

export async function markerTexture(image:number) {
  const asset=await Asset.fromModule(image).downloadAsync();
  const texture=await manipulateAsync(asset.localUri ?? asset.uri,[{resize:{width:256}}],{format:SaveFormat.JPEG,base64:true});
  return texture.base64 ? "data:image/jpeg;base64,"+texture.base64 : "";
}
