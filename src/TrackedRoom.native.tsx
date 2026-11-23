import React, { createContext, useContext, useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Camera } from "expo-camera";
import { furnitureParts, furnitureName, type Design } from "./model";
import { finishById } from "./materials";
import { Button, T, s } from "./ui";
import { lockRoomAnchor, type RoomAnchor } from "./roomAnchor";
import { checkRoomTracking } from "./arSupport";

import MarkerRoom from "./MarkerRoom";

type Engine = typeof import("@reactvision/react-viro");
interface Session {
  engine: Engine;
  design: Design;
  rotation: number;
  placed: (value: boolean) => void;
  tracked: (state: number) => void;
}
const Context = createContext<Session | null>(null);

function Scene() {
  const { engine, design, rotation, placed, tracked } = useContext(Context)!;
  const {
    ViroARScene,
    ViroAmbientLight,
    ViroDirectionalLight,
    ViroARPlane,
    ViroNode,
    ViroBox,
  } = engine;
  const [anchor, setAnchor] = useState<RoomAnchor | null>(null);
  const [light, setLight] = useState(550);
  return (
    <ViroARScene
      onAmbientLightUpdate={({ intensity }) => { if (Number.isFinite(intensity)) setLight(Math.max(200, Math.min(1200, Math.round(intensity / 100) * 100))); }}
      onTrackingUpdated={tracked}
      anchorDetectionTypes={["PlanesHorizontal"]}
    >
      <ViroAmbientLight color="#ffffff" intensity={light} />
      <ViroDirectionalLight
        color="#fff7e9"
        direction={[-0.4, -1, -0.5]}
        intensity={650}
      />
      {!anchor && <ViroARPlane
        alignment="HorizontalUpward"
        minWidth={design.width / 1000}
        minHeight={design.depth / 1000}
        onAnchorFound={plane => {
          const pose = lockRoomAnchor(null, plane as unknown as Partial<RoomAnchor>);
          if (pose) {
            setAnchor(first => first ?? pose);
            placed(true);
          }
        }}
      />}
      {anchor && <ViroNode position={anchor.position} rotation={anchor.rotation}>
        <ViroNode position={anchor.center} rotation={[0, rotation, 0]}>
          {furnitureParts(design).map((part) => (
            <ViroBox
              key={part.id}
              width={part.size[0]}
              height={part.size[1]}
              length={part.size[2]}
              position={part.center}
              materials={[
                part.surface === "finish"
                  ? "mrk" + design.finish
                  : part.surface,
              ]}
            />
          ))}
        </ViroNode>
      </ViroNode>}
    </ViroARScene>
  );
}
const initialScene = { scene: Scene };
export default function TrackedRoom({
  design,
  close,
}: {
  design: Design;
  close: () => void;
}) {
  const { height } = useWindowDimensions();
  const [engine, setEngine] = useState<Engine | null>(null),
    [message, setMessage] = useState("Checking room placement support…");
  const [marker, setMarker] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [rotation, setRotation] = useState(0),
    [placed, setPlaced] = useState(false),
    [session, setSession] = useState(0);
  useEffect(() => {
    let alive = true;
    async function start() {
      let message = "";
      try {
        const viro: Engine = require("@reactvision/react-viro");
        const support = await checkRoomTracking(
          viro.isARSupportedOnDevice,
          () => !alive,
        );
        if (!alive) return;
        if (support !== "ready") {
          setMarker(true);
          setMessage(
            support === "unsupported"
              ? "This phone reports that full-size AR is unsupported. Use camera & photo placement, then freeze the room to suggest a clear area."
              : "Room tracking could not start. On Android, check Google Play Services for AR and try again, or return to the camera preview.",
          );
          return;
        }
        const permission = await Camera.requestCameraPermissionsAsync();
        if (!permission.granted)
          message =
            "Allow camera access in device settings to place your furniture.";
        else if (alive) {
          viro.ViroMaterials.createMaterials({
            ["mrk" + design.finish]: {
              diffuseTexture: finishById(design.finish).image,
              lightingModel: "Lambert",
            },
            interior: { diffuseColor: "#cfb596", lightingModel: "Lambert" },
            hardware: { diffuseColor: "#554538", lightingModel: "Lambert" },
            plinth: { diffuseColor: "#574a3f", lightingModel: "Lambert" },
          });
          setEngine(viro);
        }
      } catch {
        if (alive) setMarker(true);
        message =
          "Floor tracking did not start. You can track the printed marker with your rear camera.";
      }
      if (alive && message) setMessage(message);
    }
    setEngine(null);
    setMessage("Checking room placement support…");
    void start();
    return () => {
      alive = false;
    };
  }, [design.finish, attempt]);
  if (marker) return <MarkerRoom design={design} close={close}/>;
  return (
    <View style={s.section}>
      {engine ? (
        <Context.Provider
          value={{
            engine,
            design,
            rotation,
            placed: setPlaced,
            tracked: (state) =>
              setTracking(
                state === engine.ViroTrackingStateConstants.TRACKING_NORMAL,
              ),
          }}
        >
          <View style={{ height: Math.min(650, height * 0.62), width: "100%" }} collapsable={false}>
            <engine.ViroARSceneNavigator
              key={session}
              initialScene={initialScene}
              autofocus
            />
          </View>
          <T>
            {placed
              ? tracking ? "Walk around the furniture to see its sides and back." : "Tracking paused. Aim back at the placement area to recover the view."
              : !tracking
                ? "Move the phone slowly in good light to start tracking."
                : "Point at clear floor space wide enough for your design. Placement is automatic."}
          </T>
          {placed && (
            <View style={s.row}>
              <Button
                secondary
                onPress={() => setRotation((a) => (a + 15) % 360)}
                icon="rotate"
              >
                Turn 15°
              </Button>
              <Button
                secondary
                onPress={() => {
                  setPlaced(false);
                  setRotation(0);
                  setSession((k) => k + 1);
                }}
              >
                Place again
              </Button>
            </View>
          )}
        </Context.Provider>
      ) : (
        <>
          <T style={s.sub}>{message}</T>
          <Button secondary onPress={() => setAttempt((n) => n + 1)}>
            Retry AR
          </Button>
        </>
      )}
      <Button secondary onPress={()=>setMarker(true)}>Track a printed floor marker</Button>
      <Button onPress={close} secondary>
        Use camera & photo placement
      </Button>
    </View>
  );
}
