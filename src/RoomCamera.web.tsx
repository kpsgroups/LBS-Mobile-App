import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

// Camera permission is requested when the video element opens its stream.
export async function requestRoomCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
  return { granted: true, canAskAgain: true };
}

// Only enable Freeze after the browser has decoded a frame from the rear camera.
export const RoomCamera = forwardRef(function RoomCamera(
  {
    onCameraReady,
    onMountError,
  }: { onCameraReady: () => void; onMountError: () => void },
  ref: React.ForwardedRef<{ takePictureAsync: () => Promise<{ uri: string }> }>,
) {
  const element = useRef<HTMLVideoElement>(null);
  const failure = useRef(onMountError);
  failure.current = onMountError;
  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | undefined;
    async function open() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!mounted || !element.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        element.current.srcObject = stream;
        await element.current.play();
      } catch {
        if (mounted) failure.current();
      }
    }
    void open();
    return () => {
      mounted = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      async takePictureAsync() {
        const video = element.current;
        if (!video || !video.videoWidth || video.readyState < 2)
          throw Error("Camera frame unavailable");
        const frame = document.createElement("canvas");
        frame.width = video.videoWidth;
        frame.height = video.videoHeight;
        const context = frame.getContext("2d");
        if (!context) throw Error("Image capture unavailable");
        context.drawImage(video, 0, 0);
        return { uri: frame.toDataURL("image/jpeg", 0.85) };
      },
    }),
    [],
  );
  return (
    <video
      ref={element}
      autoPlay
      playsInline
      muted
      onLoadedData={onCameraReady}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
});
