import { useSyncExternalStore } from "react";
import { clearToken, loadToken, loadUsername, saveToken, saveUsername } from "./tokenStorage";

export type SessionStatus = "loading" | "signedIn" | "signedOut";

// Lives outside React because the API client needs the token too.
let token: string | null = null;
let status: SessionStatus = "loading";
let savedUsername: string | null = null;
const listeners = new Set<() => void>();

function update(next: string | null) {
  token = next;
  status = next ? "signedIn" : "signedOut";
  listeners.forEach((listener) => listener());
}

export const getToken = () => token;

// Ready by the time the login screen shows, because the session stays "loading" until it's read.
export const getSavedUsername = () => savedUsername;

async function readSaved(load: () => Promise<string | null>) {
  try {
    return await load();
  } catch (e) {
    console.warn("Couldn't read the saved session", e);
    return null;
  }
}

export async function restoreSession() {
  const [stored, username] = await Promise.all([readSaved(loadToken), readSaved(loadUsername)]);
  if (status === "loading") {
    savedUsername = username;
    update(stored);
  }
}

// A failed save only means signing in again next launch, so it doesn't stop this one.
export function startSession(next: string, username: string) {
  savedUsername = username;
  update(next);
  saveToken(next).catch((e) => console.warn("Couldn't save the session", e));
  saveUsername(username).catch((e) => console.warn("Couldn't save the username", e));
}

// The saved username stays, so it's filled in when they next sign in.
export function endSession() {
  update(null);
  clearToken().catch((e) => console.warn("Couldn't clear the saved session", e));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getStatus = () => status;

export const useSessionStatus = () => useSyncExternalStore(subscribe, getStatus, getStatus);
