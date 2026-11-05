import { endSession, getToken, startSession } from "@/lib/auth/session";
import { api, unwrap } from "./client";

export const requestLoginCode = async (username: string) =>
  unwrap(
    await api.POST("/api/auth/otp/request", {
      body: { username },
    })
  );

export const signIn = async (username: string, code: string) => {
  const { token } = unwrap(
    await api.POST("/api/auth/otp/verify", {
      body: { username, code },
    })
  );
  if (!token) throw new Error("The server didn't return a session");
  startSession(token, username);
};

// Signs out here straight away, so a slow or unreachable server can't hold it up. If the call
// fails the server's copy of the session just lasts until it expires.
export const signOut = () => {
  const token = getToken();
  endSession();
  api
    .POST("/api/auth/logout", { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {});
};
