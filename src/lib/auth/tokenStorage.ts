import * as SecureStore from "expo-secure-store";

const KEY = "session_token";
const USERNAME_KEY = "saved_username";

export const loadToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (token: string) => SecureStore.setItemAsync(KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);

export const loadUsername = () => SecureStore.getItemAsync(USERNAME_KEY);
export const saveUsername = (username: string) => SecureStore.setItemAsync(USERNAME_KEY, username);
