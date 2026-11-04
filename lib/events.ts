export const EVENTS = {
  messages: "app:messages-changed",
  friends: "app:friends-changed",
  notices: "app:notices-read",
} as const;

export function emitEvent(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

export function onEvent(name: string, handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}
