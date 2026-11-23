const { withAndroidManifest } = require("expo/config-plugins");

// Both the camera and Viro config plugins declare CAMERA in the same manifest.
module.exports = function withRoomManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const camera = "android.permission.CAMERA";
    const permissions = manifest["uses-permission"] || [];
    let seenCamera = false;
    manifest["uses-permission"] = permissions.filter((permission) => {
      if (permission.$["android:name"] !== camera) return true;
      if (seenCamera) return false;
      seenCamera = true;
      return true;
    });
    const feature = manifest["uses-feature"]?.find(
      (feature) => feature.$["android:name"] === "android.hardware.camera",
    );
    if (feature) feature.$["android:required"] = "false";
    return config;
  });
};
