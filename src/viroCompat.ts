// ViroReact 2.43.6 reads `require("react-native/Libraries/Image/AssetRegistry").default`,
// but React Native 0.81 ships that module with named exports only. Without a
// `default`, every material that uses a bundled image (the laminate texture)
// fails with "Cannot read property 'getAssetByID' of undefined" and AR never opens.
// Give the module a `default` that points at itself before ViroReact uses it.
export function withDefaultExport<T extends object>(mod: T): T {
  if (mod && typeof mod === "object" && !("default" in mod)) {
    Object.defineProperty(mod, "default", { value: mod, enumerable: false, configurable: true });
  }
  return mod;
}

export function patchViroAssetRegistry() {
  const registry = withDefaultExport(require("react-native/Libraries/Image/AssetRegistry") as { getAssetByID?: unknown; default?: { getAssetByID?: unknown } });
  if (typeof registry.default?.getAssetByID !== "function") throw Error("React Native asset registry unavailable");
}
