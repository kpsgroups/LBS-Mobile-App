export async function checkRoomTracking(
  probe: () => Promise<{ isARSupported: boolean }>,
  cancelled: () => boolean,
  pause = () => new Promise<void>((resolve) => setTimeout(resolve, 300)),
) {
  // ARCore can report TRANSIENT during its first availability query after launch.
  for (let attempt = 0; attempt < 12 && !cancelled(); attempt++) {
    try {
      return (await probe()).isARSupported ? "ready" : "unsupported";
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (reason === "UNSUPPORTED") return "unsupported";
      if (reason !== "TRANSIENT" && reason !== "UNKNOWN") return "unavailable";
      if (attempt < 11) await pause();
    }
  }
  return "unavailable";
}
