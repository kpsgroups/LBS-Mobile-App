export type RoomTracking =
  | { status: "ready"; detail: string }
  // Google Play Services for AR says this phone model can never run AR.
  | { status: "unsupported"; detail: string }
  // No definite answer (still checking, offline, or not installed yet). AR is
  // still opened: ViroReact asks to install or update Google Play Services
  // for AR itself, and the app shows what went wrong if tracking never starts.
  | { status: "uncertain"; detail: string };

export async function checkRoomTracking(
  probe: () => Promise<{ isARSupported: boolean }>,
  cancelled: () => boolean,
  pause = () => new Promise<void>((resolve) => setTimeout(resolve, 400)),
  attempts = 8,
): Promise<RoomTracking> {
  let detail = "no answer";
  // ARCore reports TRANSIENT while its first availability query after launch is running.
  for (let attempt = 0; attempt < attempts && !cancelled(); attempt++) {
    try {
      const result = await probe();
      return result.isARSupported
        ? { status: "ready", detail: "SUPPORTED" }
        : { status: "unsupported", detail: "UNSUPPORTED" };
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error);
      if (detail === "UNSUPPORTED") return { status: "unsupported", detail };
      if (detail !== "TRANSIENT" && detail !== "UNKNOWN") return { status: "uncertain", detail };
      if (attempt < attempts - 1) await pause();
    }
  }
  return { status: "uncertain", detail };
}
