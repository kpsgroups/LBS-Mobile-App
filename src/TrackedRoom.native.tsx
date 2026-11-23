import React, { createContext, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { Camera } from "expo-camera";
import { wardrobe, type Design } from "./model";
import { finishById } from "./materials";
import { Button, T, s } from "./ui";
import { checkRoomTracking } from "./arSupport";

type Engine = typeof import("@reactvision/react-viro");
interface Session {
  engine: Engine;
  design: Design;
  rotation: number;
  placed: () => void;
  tracked: (state: number) => void;
}
const Context = createContext<Session | null>(null);

function Scene() {
  const { engine, design, rotation, placed, tracked } = useContext(Context)!;
  const {
    ViroARScene,
    ViroAmbientLight,
    ViroDirectionalLight,
    ViroARPlaneSelector,
    ViroNode,
    ViroBox,
  } = engine;
  return (
    <ViroARScene
      onTrackingUpdated={tracked}
      anchorDetectionTypes={["PlanesHorizontal"]}
    >
      <ViroAmbientLight color="#ffffff" intensity={550} />
      <ViroDirectionalLight
        color="#fff7e9"
        direction={[-0.4, -1, -0.5]}
        intensity={650}
      />
      <ViroARPlaneSelector
        alignment="Horizontal"
        maxPlanes={4}
        minWidth={0.35}
        minHeight={0.35}
        onPlaneSelected={placed}
      >
        <ViroNode rotation={[0, rotation, 0]}>
          {wardrobe(design).map((part) => (
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
      </ViroARPlaneSelector>
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
  const [engine, setEngine] = useState<Engine | null>(null),
    [message, setMessage] = useState("Checking room placement support…");
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
          setMessage(
            support === "unsupported"
              ? "This phone reports that full-size AR is unsupported. Use the camera or a room photo to show the design."
              : "Room tracking could not start. On Android, check Google Play Services for AR and try again, or return to the camera preview.",
          );
          return;
        }
        const permission = await Camera.requestCameraPermissionsAsync();
        if (!permission.granted)
          message =
            "Allow camera access in device settings to place your wardrobe.";
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
        message =
          "Room placement requires the LBS native build on an ARKit or ARCore device with AR services available.";
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
  return (
    <View style={s.section}>
      {engine ? (
        <Context.Provider
          value={{
            engine,
            design,
            rotation,
            placed: () => setPlaced(true),
            tracked: (state) =>
              setTracking(
                state === engine.ViroTrackingStateConstants.TRACKING_NORMAL,
              ),
          }}
        >
          <View style={{ height: 370, width: "100%" }} collapsable={false}>
            <engine.ViroARSceneNavigator
              key={session}
              initialScene={initialScene}
              autofocus
            />
          </View>
          <T>
            {placed
              ? "Wardrobe placed at full size."
              : !tracking
                ? "Move the phone slowly in good light to start tracking."
                : "Move slowly to scan the floor, then tap a detected surface."}
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
      <Button onPress={close} secondary>
        Back to room preview
      </Button>
    </View>
  );
}
