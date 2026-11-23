import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { CameraView } from "expo-camera";
import { RoomCamera, requestRoomCameraPermission } from "./RoomCamera";
import { launchImageLibraryAsync } from "expo-image-picker";
import { suggestPlacement } from "./photoPlacement";
import { Button, Chips, Label, T, s } from "./ui";
import { Preview } from "./Preview";
import TrackedRoom from "./TrackedRoom";
import { finishById } from "./materials";
import { furnitureName, type Design } from "./model";

type Background =
  | { type: "studio" }
  | { type: "camera" }
  | { type: "photo"; uri: string };
export default function Room({
  design,
  projectName,
  close,
  backLabel,
}: {
  design: Design;
  projectName: string;
  close: () => void;
  backLabel: string;
}) {
  const [background, setBackground] = useState<Background>({ type: "studio" });
  const [tracked, setTracked] = useState(Platform.OS !== "web"),
    [view, setView] = useState("Exterior");
  const [angle, setAngle] = useState(24),
    [scale, setScale] = useState(0.78);
  const [point, setPoint] = useState({ x: 0.5, y: 0.52 });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [message, setMessage] = useState(""),
    [settings, setSettings] = useState(false);
  const [ready, setReady] = useState(false),
    [active, setActive] = useState(AppState.currentState !== "background");
  const [pending, setPending] = useState(false);
  const camera = useRef<CameraView>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
      if (state !== "active") setReady(false);
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tracked) setTracked(false);
      else close();
      return true;
    });
    return () => back.remove();
  }, [tracked, close]);
  async function startCamera() {
    currentPhoto.current = "";
    setPending(true);
    setMessage("");
    setSettings(false);
    try {
      const permission = await requestRoomCameraPermission();
      if (!alive.current) return;
      if (!permission.granted) {
        setMessage(
          "Camera access is off. Allow camera access or choose a room photo.",
        );
        setSettings(Platform.OS !== "web" && !permission.canAskAgain);
        return;
      }
      setReady(false);
      setBackground({ type: "camera" });
    } catch {
      if (alive.current)
        setMessage(
          "The camera could not open. Choose a room photo or try again.",
        );
    } finally {
      if (alive.current) setPending(false);
    }
  }
  const currentPhoto = useRef("");
  async function placePhoto(uri: string) {
    currentPhoto.current = uri;
    setBackground({ type:"photo", uri });
    setMessage("Finding a clear area in the room photo…");
    try {
      const suggestion = await suggestPlacement(uri, frame);
      if (!alive.current || currentPhoto.current !== uri) return;
      setPoint(suggestion);
      setMessage("Suggested position from the room photo. Tap to adjust and check the fit by eye.");
    } catch {
      if (alive.current && currentPhoto.current === uri) setMessage("Tap the room photo to position the design.");
    }
  }
  async function choosePhoto() {
    setMessage("");
    setSettings(false);
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.88,
      });
      if (alive.current && !result.canceled && result.assets[0])
        await placePhoto(result.assets[0].uri);
    } catch {
      if (alive.current)
        setMessage(
          "This photo could not be opened. Choose another room photo.",
        );
    }
  }
  async function freeze() {
    setPending(true);
    try {
      const photo = await camera.current?.takePictureAsync({
        quality: 0.85,
        shutterSound: false,
      });
      if (alive.current && photo)
        await placePhoto(photo.uri);
    } catch {
      if (alive.current)
        setMessage(
          "The camera frame could not be captured. Try again or choose a photo.",
        );
    } finally {
      if (alive.current) setPending(false);
    }
  }
  const inRoom = background.type !== "studio",
    finish = finishById(design.finish);
  const width = Math.min(frame.width, (frame.height * 4) / 3) * scale,
    height = width * 0.75;
  const left = Math.max(
    0,
    Math.min(frame.width - width, point.x * frame.width - width / 2),
  );
  const top = Math.max(
    0,
    Math.min(frame.height - height, point.y * frame.height - height / 2),
  );
  if (tracked)
    return <TrackedRoom design={design} close={() => { setTracked(false); void startCamera(); }} />;
  return (
    <View style={s.section}>
      <Label>CUSTOMER PREVIEW</Label>
      <T style={s.h2}>{projectName.trim() || furnitureName(design)}</T>
      <T style={s.sub}>
        {design.width} × {design.height} × {design.depth} mm · {finish.name} ·
        MRK-{finish.id}
      </T>
      <View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setFrame({ width, height });
        }}
        style={{
          height: 340,
          backgroundColor: "#eeeae0",
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        {background.type === "camera" && active && (
          <RoomCamera
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setReady(true)}
            onMountError={() => {
              setReady(false);
              setBackground({ type: "studio" });
              setMessage(
                "The rear camera is unavailable. Try again or choose a room photo.",
              );
            }}
          />
        )}
        {background.type === "photo" && (
          <Image
            accessibilityLabel="Customer room photo"
            resizeMode="cover"
            source={{ uri: background.uri }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            onError={() => {
              setBackground({ type: "studio" });
              setMessage(
                "Choose another room photo. This image could not be displayed.",
              );
            }}
          />
        )}
        {inRoom ? (
          <>
            <View
              pointerEvents="none"
              style={{ position: "absolute", left, top, width, height }}
            >
              <Preview
                design={design}
                open={view === "Interior"}
                angle={angle}
                overlay
                height={height}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Position design in room"
              style={StyleSheet.absoluteFill}
              onPress={(e) => {
                if (frame.width && frame.height)
                  setPoint({
                    x: e.nativeEvent.locationX / frame.width,
                    y: e.nativeEvent.locationY / frame.height,
                  });
              }}
            />
          </>
        ) : (
          <Preview
            design={design}
            open={view === "Interior"}
            angle={angle}
            height={340}
          />
        )}
      </View>
      {inRoom && (
        <T style={s.sub}>
          Tap the room to position the design. Size is adjusted by eye.
        </T>
      )}
      <View style={s.row}>
        {background.type === "camera" ? (
          <Button icon="camera" disabled={!ready || pending} onPress={freeze}>
            Freeze & auto-place
          </Button>
        ) : (
          <Button icon="camera" disabled={pending} onPress={startCamera}>
            Live camera
          </Button>
        )}
        <Button secondary onPress={choosePhoto}>
          Choose room photo
        </Button>
      </View>
      {!!message && (
        <T accessibilityRole="alert" style={s.sub}>
          {message}
        </T>
      )}
      {settings && (
        <Button
          secondary
          onPress={() => {
            void Linking.openSettings().catch(() =>
              setMessage(
                "Open phone Settings → Apps → LBS Interior Studio → Permissions → Camera.",
              ),
            );
          }}
        >
          Open settings
        </Button>
      )}
      <View style={s.row}>
        <Chips
          values={["Exterior", "Interior"]}
          selected={view}
          select={setView}
        />
        <Button
          secondary
          icon="rotate"
          onPress={() => setAngle((a) => (a === 24 ? 0 : a === 0 ? -28 : 24))}
        >
          Turn
        </Button>
      </View>
      {inRoom && (
        <View style={s.row}>
          <Button
            secondary
            disabled={scale <= 0.35}
            onPress={() => setScale((n) => Math.max(0.35, n - 0.1))}
          >
            Smaller
          </Button>
          <Button
            secondary
            disabled={scale >= 1}
            onPress={() => setScale((n) => Math.min(1, n + 0.1))}
          >
            Larger
          </Button>
        </View>
      )}
      {Platform.OS !== "web" && (
        <Button
          secondary
          onPress={() => {
            if (background.type === "camera") setBackground({ type: "studio" });
            setTracked(true);
          }}
        >
          Full-size AR
        </Button>
      )}
      <Button secondary onPress={close}>
        {backLabel}
      </Button>
    </View>
  );
}
