// expo-secure-store has no web support, so the browser build uses localStorage.

const KEY = "session_token";
const USERNAME_KEY = "saved_username";

export const loadToken = async () => localStorage.getItem(KEY);
export const saveToken = async (token: string) => localStorage.setItem(KEY, token);
export const clearToken = async () => localStorage.removeItem(KEY);

export const loadUsername = async () => localStorage.getItem(USERNAME_KEY);
export const saveUsername = async (username: string) => localStorage.setItem(USERNAME_KEY, username);
