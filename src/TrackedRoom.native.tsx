import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, Modal, NativeModules, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import { designLimits, furnitureParts, furnitureName, laminateSurfaces, type Design, type LaminateSurface, type Surface, type Triple } from "./model";
import { finishById, finishes } from "./materials";
import { Button, Icon, T, color, s, type IconName } from "./ui";
import { checkRoomTracking } from "./arSupport";
import { patchViroAssetRegistry } from "./viroCompat";
import { fixedSurfaces, isLaminate, laminateFor } from "./surfaces";
import {
  footprintOutline,
  formatSize,
  normalizeYaw,
  pickFloorHit,
  poseChanged,
  trackingHint,
  yawToward,
} from "./arPlacement";

// ViroReact installs or updates Google Play Services for AR itself when the AR
// view opens. These links are the manual route if that prompt never appears.
const arCoreStore = "market://details?id=com.google.ar.core";
const arCoreWeb = "https://play.google.com/store/apps/details?id=com.google.ar.core";
const arPhones = "https://developers.google.com/ar/devices";
// ViroReact reports AR startup failures only to the device log, so treat a
// session that never reports tracking within this time as failed to start.
const STARTUP_TIMEOUT = 12000;

function openArCoreStore() {
  void Linking.openURL(arCoreStore).catch(() => Linking.openURL(arCoreWeb).catch(() => {}));
}

type Engine = typeof import("@reactvision/react-viro");
type Pose = { position: Triple; yaw: number };
interface Session {
  engine: Engine;
  design: Design;
  open: boolean;
  yaw: number;
  setYaw: (yaw: number) => void;
  placed: boolean;
  // The dragged position lives in a ref: ViroReact moves the node natively, and
  // re-rendering from React state on every drag event would fight that motion.
  position: React.MutableRefObject<Triple | null>;
  found: (pose: Pose | null) => void;
  tracked: (state: number, reason: number) => void;
}
const Context = createContext<Session | null>(null);

// Lights and the shadow receiver only affect objects that share their bit mask.
const SHADOW = 2;
const HIT_TEST_INTERVAL = 66; // ~15 Hz is smooth for the preview and far cheaper than every frame.
const LOST_AFTER = 600; // Keep the preview briefly when one frame misses the floor.

function Scene() {
  const { engine, design, open, yaw, setYaw, placed, position, found, tracked } = useContext(Context)!;
  const { ViroARScene, ViroAmbientLight, ViroDirectionalLight, ViroSpotLight, ViroNode, ViroBox, ViroQuad, ViroPolygon } = engine;
  const [light, setLight] = useState({ intensity: 550, color: "#ffffff" });
  const [preview, setPreview] = useState<Pose | null>(null);
  const last = useRef<{ pose: Pose | null; at: number; seen: number }>({ pose: null, at: 0, seen: 0 });
  const rotateFrom = useRef(0);
  const parts = useMemo(() => furnitureParts(design, open), [design, open]);
  const outline = useMemo(() => footprintOutline(design), [design.width, design.depth]);
  const w = design.width / 1000, h = design.height / 1000, d = design.depth / 1000;
  const material = (surface: Surface) => (isLaminate(surface) ? "mrk" + laminateFor(design, surface) : "lbs-" + surface);

  const pose = placed && position.current ? { position: position.current, yaw } : preview;
  return (
    <ViroARScene
      anchorDetectionTypes={["PlanesHorizontal"]}
      onTrackingUpdated={tracked}
      onAmbientLightUpdate={({ intensity, color }) => {
        if (!Number.isFinite(intensity)) return;
        const next = Math.max(200, Math.min(1200, Math.round(intensity / 100) * 100));
        setLight((l) => (l.intensity === next && l.color === color ? l : { intensity: next, color: color || "#ffffff" }));
      }}
      // Hit testing stops once the furniture is placed, saving battery and bridge traffic.
      onCameraARHitTest={placed ? undefined : (event) => {
        const now = Date.now();
        if (now - last.current.at < HIT_TEST_INTERVAL) return;
        last.current.at = now;
        const camera = event.cameraOrientation.position as Triple;
        const hit = pickFloorHit(event.hitTestResults, camera[1]);
        if (!hit) {
          if (last.current.pose && now - last.current.seen > LOST_AFTER) {
            last.current.pose = null;
            setPreview(null);
            found(null);
          }
          return;
        }
        last.current.seen = now;
        const next = { position: hit.position, yaw: yawToward(hit.position, camera) };
        if (poseChanged(last.current.pose, next)) {
          last.current.pose = next;
          setPreview(next);
          found(next);
        }
      }}
    >
      <ViroAmbientLight color={light.color} intensity={light.intensity} />
      <ViroDirectionalLight color="#fff7e9" direction={[-0.4, -1, -0.5]} intensity={650} />
      {pose && (
        <ViroNode
          key={placed ? "placed" : "preview"}
          position={pose.position}
          rotation={[0, pose.yaw, 0]}
          opacity={placed ? 1 : 0.62}
          {...(placed
            ? {
                dragType: "FixedToPlane" as const,
                dragPlane: { planePoint: pose.position, planeNormal: [0, 1, 0] as Triple, maxDistance: 8 },
                onDrag: (to: Triple) => {
                  if (to.every(Number.isFinite)) position.current = [to[0], pose.position[1], to[2]];
                },
                onRotate: (state: number, factor: number) => {
                  if (state === 1) rotateFrom.current = yaw;
                  else setYaw(normalizeYaw(Math.round(rotateFrom.current - factor)));
                },
              }
            : {})}
        >
          {!placed && outline.map((edge, i) => (
            <ViroBox key={"edge" + i} width={edge.size[0]} height={edge.size[1]} length={edge.size[2]} position={edge.center} materials={["lbsOutline"]} />
          ))}
          {!placed && (
            <ViroQuad rotation={[-90, 0, 0]} position={[0, 0.002, 0]} width={w} height={d} materials={["lbsFootprint"]} />
          )}
          {placed && (
            <>
              <ViroSpotLight
                position={[0, h + 1.6, 0.4]}
                direction={[0, -1, -0.12]}
                color="#ffffff"
                intensity={220}
                innerAngle={20}
                outerAngle={55}
                attenuationStartDistance={h + 2}
                attenuationEndDistance={h + 6}
                castsShadow
                influenceBitMask={SHADOW}
                shadowMapSize={1024}
                shadowNearZ={0.3}
                shadowFarZ={h + 3}
                shadowOpacity={0.5}
              />
              <ViroQuad
                rotation={[-90, 0, 0]}
                position={[0, 0.001, 0]}
                width={w + 1.2}
                height={d + 1.2}
                arShadowReceiver
                lightReceivingBitMask={SHADOW}
              />
            </>
          )}
          {parts.map((part) =>
            part.outline ? (
              // Curved parts (arches, discs, waves) are flat polygons on their front face.
              <ViroPolygon
                key={part.id}
                vertices={part.outline}
                holes={[]}
                position={[part.center[0], part.center[1], part.center[2] + part.size[2] / 2]}
                materials={[material(part.surface)]}
                lightReceivingBitMask={1 | SHADOW}
                shadowCastingBitMask={placed && part.surface !== "glow" ? SHADOW : 0}
              />
            ) : (
            <ViroBox
              key={part.id}
              width={part.size[0]}
              height={part.size[1]}
              length={part.size[2]}
              position={part.center}
              materials={[material(part.surface)]}
              lightReceivingBitMask={1 | SHADOW}
              shadowCastingBitMask={placed && part.surface !== "glow" ? SHADOW : 0}
            />
            ),
          )}
        </ViroNode>
      )}
    </ViroARScene>
  );
}
const initialScene = { scene: Scene };

function Control({ icon, label, onPress, primary, disabled, active }: { icon?: IconName; label: string; onPress: () => void; primary?: boolean; disabled?: boolean; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        primary && styles.primary,
        active && styles.active,
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon && <Icon name={icon} size={18} tint={primary ? color.white : color.ink} />}
      <T style={{ fontFamily: "DMBold", fontSize: 14, color: primary ? color.white : color.ink, flexShrink: 1, textAlign: "center" }}>{label}</T>
    </Pressable>
  );
}

// Creates the ViroReact materials for a design's laminates. Viro adds materials
// by name without clearing others, so switching laminate never restarts AR.
function laminateMaterials(viro: Engine, d: Design) {
  viro.ViroMaterials.createMaterials(Object.fromEntries(laminateSurfaces.map((surface) => {
    const id = laminateFor(d, surface);
    return ["mrk" + id, { diffuseTexture: finishById(id).image, lightingModel: "Lambert" as const }];
  })));
}

const slotNames: Record<LaminateSurface, string> = { finish: "Main", accent: "Feature panel", detail: "Detail" };
const groups = [...new Set(finishes.map((f) => f.group))];
const dimensionNames = { width: "Width", height: "Height", depth: "Depth" } as const;

// Colour and size controls shown over the camera while the model stays placed.
function ArPanel({ kind, design, update, close }: { kind: "colour" | "size"; design: Design; update: (d: Design) => void; close: () => void }) {
  const slots = useMemo(() => {
    const used = new Set(furnitureParts(design).map((p) => p.surface));
    return laminateSurfaces.filter((slot) => slot === "finish" || used.has(slot));
  }, [design]);
  const [slot, setSlot] = useState<LaminateSurface>("finish");
  const current = finishById(laminateFor(design, slot));
  const [group, setGroup] = useState(current.group);
  const limits = designLimits(design);
  return (
    <View style={styles.panel}>
      <View style={s.between}>
        <T style={{ fontFamily: "DMBold", fontSize: 15 }}>{kind === "colour" ? `${current.name} · MRK-${current.id}` : formatSize(design)}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={kind === "colour" ? "Close colours" : "Close size"} onPress={close} style={{ padding: 6 }}>
          <Icon name="close" size={18} />
        </Pressable>
      </View>
      {kind === "colour" ? (
        <>
          {slots.length > 1 && (
            <View style={s.row}>
              {slots.map((name) => (
                <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: slot === name }}
                  onPress={() => { setSlot(name); setGroup(finishById(laminateFor(design, name)).group); }}
                  style={[styles.chip, slot === name && styles.chipOn]}>
                  <T style={{ fontSize: 13, color: slot === name ? color.white : color.ink }}>{slotNames[name]}</T>
                </Pressable>
              ))}
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {groups.map((name) => (
              <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: group === name }}
                onPress={() => setGroup(name)} style={[styles.chip, group === name && styles.chipOn]}>
                <T style={{ fontSize: 13, color: group === name ? color.white : color.ink }}>{name}</T>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {finishes.filter((f) => f.group === group).map((f) => (
              <Pressable key={String(f.id)} accessibilityRole="button" accessibilityLabel={`Use ${f.name} MRK-${f.id}`}
                accessibilityState={{ selected: f.id === current.id }} onPress={() => update({ ...design, [slot]: f.id })}>
                <Image source={f.image} style={[styles.swatch, f.id === current.id && styles.swatchOn]} />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : (
        (Object.keys(dimensionNames) as (keyof typeof dimensionNames)[]).map((field) => {
          const [min, max, step] = limits[field], value = design[field];
          const set = (next: number) => update({ ...design, [field]: Math.max(min, Math.min(max, next)) });
          return (
            <View key={field} style={s.between}>
              <T style={{ width: 64 }}>{dimensionNames[field]}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={"Decrease " + field} disabled={value <= min} onPress={() => set(value - step)}
                style={[styles.step, { opacity: value <= min ? 0.35 : 1 }]}>
                <Icon name="minus" size={16} />
              </Pressable>
              <T style={{ fontFamily: "DMBold", minWidth: 84, textAlign: "center" }}>{value} mm</T>
              <Pressable accessibilityRole="button" accessibilityLabel={"Increase " + field} disabled={value >= max} onPress={() => set(value + step)}
                style={[styles.step, { opacity: value >= max ? 0.35 : 1 }]}>
                <Icon name="plus" size={16} />
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

export default function TrackedRoom({ design: initial, close, change }: { design: Design; close: () => void; change?: (d: Design) => void }) {
  const insets = useSafeAreaInsets();
  // Colour and size can change inside AR; the editor gets every change.
  const [design, setDesign] = useState(initial);
  const latest = useRef(design);
  latest.current = design;
  const [panel, setPanel] = useState<"colour" | "size" | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null),
    [message, setMessage] = useState("Starting AR…");
  const [settings, setSettings] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  // Last ARCore / ARKit availability answer, shown when AR does not start.
  const [detail, setDetail] = useState("");
  const [started, setStarted] = useState(false),
    [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tracking, setTracking] = useState({ normal: false, reason: 1 });
  const [yaw, setYaw] = useState(0),
    [placed, setPlaced] = useState(false),
    [found, setFound] = useState(false),
    [open, setOpen] = useState(false),
    [session, setSession] = useState(0);
  const candidate = useRef<Pose | null>(null);
  const hasDoors = useMemo(() => furnitureParts(design, true).length !== furnitureParts(design).length, [design]);
  const position = useRef<Triple | null>(null);

  useEffect(() => {
    let alive = true;
    async function start() {
      let message = "";
      let step = "support check";
      try {
        const probe = Platform.OS === "android" ? NativeModules.VRTARSceneNavigatorModule?.isARSupportedOnDevice : NativeModules.VRTARUtils?.isARSupported;
        if (typeof probe === "function") {
          const { isARSupportedOnDevice } = require("@reactvision/react-viro/dist/components/Utilities/ViroUtils") as Pick<Engine, "isARSupportedOnDevice">;
          const support = await checkRoomTracking(isARSupportedOnDevice, () => !alive);
          if (!alive) return;
          setDetail(support.detail);
          // Only a definite "unsupported" stops here. Anything uncertain still
          // opens AR, which lets ViroReact prompt to install Google Play Services for AR.
          if (support.status === "unsupported") {
            setUnsupported(true);
            return;
          }
        } else setDetail("AR support check unavailable");
        step = "camera permission";
        const permission = await Camera.requestCameraPermissionsAsync();
        if (!alive) return;
        if (!permission.granted) {
          message = "Allow camera access to see your furniture full size in the room.";
          setSettings(!permission.canAskAgain);
        } else {
          step = "AR renderer";
          patchViroAssetRegistry();
          const viro: Engine = require("@reactvision/react-viro");
          laminateMaterials(viro, latest.current);
          viro.ViroMaterials.createMaterials({
            "lbs-interior": { diffuseColor: fixedSurfaces.interior, lightingModel: "Lambert" },
            "lbs-hardware": { diffuseColor: fixedSurfaces.hardware, lightingModel: "Lambert" },
            "lbs-plinth": { diffuseColor: fixedSurfaces.plinth, lightingModel: "Lambert" },
            // LED strips ignore scene lighting so they read as light sources.
            "lbs-glow": { diffuseColor: fixedSurfaces.glow, lightingModel: "Constant" },
            "lbs-mirror": { diffuseColor: fixedSurfaces.mirror, shininess: 60, lightingModel: "Blinn" },
            "lbs-trim": { diffuseColor: fixedSurfaces.trim, shininess: 24, lightingModel: "Blinn" },
            "lbs-screen": { diffuseColor: fixedSurfaces.screen, shininess: 48, lightingModel: "Blinn" },
            lbsOutline: { diffuseColor: "#ffffff", lightingModel: "Constant" },
            lbsFootprint: { diffuseColor: "#ffffff38", lightingModel: "Constant", writesToDepthBuffer: false },
          });
          setEngine(viro);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        message = `AR could not start (${step}: ${reason}).`;
      }
      if (alive && message) setMessage(message);
    }
    setEngine(null);
    setSettings(false);
    setUnsupported(false);
    setMessage("Starting AR…");
    void start();
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Watch for an AR session that opens but never starts tracking, e.g. when
  // Google Play Services for AR is missing, outdated or still installing.
  useEffect(() => {
    if (!engine || started) return;
    setStalled(false);
    const timer = setTimeout(() => setStalled(true), STARTUP_TIMEOUT);
    return () => clearTimeout(timer);
  }, [engine, started, session]);

  const context = useMemo<Session | null>(
    () =>
      engine && {
        engine,
        design,
        open,
        yaw,
        setYaw,
        placed,
        position,
        found: (pose) => {
          candidate.current = pose;
          setFound(!!pose);
        },
        tracked: (state, reason) => {
          setStarted(true);
          setStalled(false);
          setTracking((t) => {
            const normal = state === engine.ViroTrackingStateConstants.TRACKING_NORMAL;
            return t.normal === normal && t.reason === reason ? t : { normal, reason };
          });
        },
      },
    [engine, design, open, yaw, placed],
  );

  function update(next: Design) {
    if (engine) laminateMaterials(engine, next);
    setDesign(next);
    change?.(next);
  }
  function place() {
    const pose = candidate.current;
    if (!pose) return;
    position.current = pose.position;
    setYaw(pose.yaw);
    setPlaced(true);
  }
  function move() {
    position.current = null;
    candidate.current = null;
    setFound(false);
    setPlaced(false);
  }
  function restart() {
    move();
    setYaw(0);
    setTracking({ normal: false, reason: 1 });
    setStarted(false);
    setStalled(false);
    setSession((k) => k + 1);
  }

  if (unsupported)
    return (
      <View style={s.section}>
        <T style={s.h2}>Full-size AR</T>
        <T style={s.sub}>
          Google Play Services for AR reports that this phone cannot run AR, so full-size placement is not available on it. Android AR needs a phone on Google's supported list.
        </T>
        <Button secondary onPress={() => void Linking.openURL(arPhones).catch(() => {})}>See supported phones</Button>
        <Button secondary onPress={() => setAttempt((n) => n + 1)}>Check again</Button>
        <Button onPress={close}>Use camera &amp; photo placement</Button>
      </View>
    );
  if (!engine || !context)
    return (
      <View style={s.section}>
        <T style={s.h2}>Full-size AR</T>
        <T style={s.sub}>{message}</T>
        {settings ? (
          <Button onPress={() => void Linking.openSettings().catch(() => {})}>Open settings</Button>
        ) : (
          <Button secondary onPress={() => setAttempt((n) => n + 1)}>Retry AR</Button>
        )}
        {Platform.OS === "android" && (
          <Button secondary onPress={openArCoreStore}>Install or update Google Play Services for AR</Button>
        )}
        <Button onPress={close} secondary>Use camera &amp; photo placement</Button>
      </View>
    );

  // Full screen, outside the page ScrollView, so drag and rotate gestures reach
  // the AR view and the camera fills the phone.
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={close}>
      <View style={styles.screen}>
        <Context.Provider value={context}>
          <engine.ViroARSceneNavigator key={session} initialScene={initialScene} autofocus style={StyleSheet.absoluteFill} />
        </Context.Provider>
        <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 10 }]}>
          <View style={styles.badge}>
            <T style={{ fontFamily: "DMBold", fontSize: 15 }} numberOfLines={1}>{furnitureName(design)}</T>
            <T style={{ fontSize: 12, color: color.muted }}>{formatSize(design)} · actual size</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close AR" onPress={close} style={styles.round}>
            <Icon name="close" size={20} />
          </Pressable>
        </View>
        {stalled && (
          <View style={styles.stalled}>
            <T style={{ fontFamily: "DMBold", fontSize: 17 }}>AR has not started</T>
            <T style={{ color: color.muted, lineHeight: 21 }}>
              {Platform.OS === "android"
                ? "Full-size AR needs Google Play Services for AR. Install or update it, accept any prompt it shows, then try again. Good light and a textured floor also help."
                : "Allow camera access and try again in good light, pointing at a textured floor."}
            </T>
            {!!detail && <T style={{ fontSize: 12, color: color.muted }}>AR check: {detail}</T>}
            {Platform.OS === "android" && <Control primary label="Install or update Google Play Services for AR" onPress={openArCoreStore} />}
            <Control label="Try again" onPress={restart} />
            <Control label="Use camera & photo placement" onPress={close} />
          </View>
        )}
        <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.hint}>
            <T accessibilityLiveRegion="polite" style={{ color: color.white, fontSize: 14, textAlign: "center" }}>
              {trackingHint(tracking.normal, tracking.reason, found, placed)}
            </T>
          </View>
          {panel && <ArPanel kind={panel} design={design} update={update} close={() => setPanel(null)} />}
          <View style={styles.controls}>
            <Control icon="materials" label="Colour" active={panel === "colour"} onPress={() => setPanel(panel === "colour" ? null : "colour")} />
            <Control icon="plus" label="Size" active={panel === "size"} onPress={() => setPanel(panel === "size" ? null : "size")} />
          </View>
          {placed ? (
            <View style={styles.controls}>
              <Control icon="rotate" label="Turn 15°" onPress={() => setYaw((a) => normalizeYaw(a + 15))} />
              {hasDoors && <Control label={open ? "Close doors" : "Open doors"} onPress={() => setOpen((o) => !o)} />}
              <Control label="Move" onPress={move} />
            </View>
          ) : (
            <View style={styles.controls}>
              <Control primary icon="check" label="Place here" disabled={!found || !tracking.normal} onPress={place} />
              <Control label="Restart" onPress={restart} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  badge: { flex: 1, backgroundColor: "#fffef9eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fffef9eb", alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, gap: 10, alignItems: "center" },
  hint: { backgroundColor: "#20231cd0", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 480 },
  controls: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  control: { minHeight: 48, borderRadius: 24, paddingHorizontal: 18, backgroundColor: "#fffef9f0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primary: { backgroundColor: color.sage },
  active: { borderWidth: 2, borderColor: color.sage },
  panel: { alignSelf: "stretch", maxWidth: 560, backgroundColor: "#fffef9f5", borderRadius: 14, padding: 12, gap: 10 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: color.line, justifyContent: "center" },
  chipOn: { backgroundColor: color.sage, borderColor: color.sage },
  swatch: { width: 52, height: 52, borderRadius: 8, borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: color.sage },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white },
  stalled: { position: "absolute", left: 16, right: 16, top: "28%", backgroundColor: "#fffef9f5", borderRadius: 14, padding: 18, gap: 10, alignItems: "stretch" },
});
