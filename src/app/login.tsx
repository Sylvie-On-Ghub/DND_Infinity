import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { requestLoginCode, signIn } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";
import { getSavedUsername } from "@/lib/auth/session";
import { C } from "@/lib/colors";

// The server allows one code request a minute per username.
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

const hasStatus = (error: Error, status: number) =>
  error instanceof ApiRequestError && error.status === status;

// `wait` is the seconds left on the countdown for this error, so the message stays current and
// goes away once the wait is over.
function errorText(error: Error, wait: number) {
  if (hasStatus(error, 429)) {
    if (wait > 0) return `Too many attempts. Try again in ${formatWait(wait)}.`;
    return (error as ApiRequestError).retryAfter ? null : "Too many attempts. Try again later.";
  }
  if (hasStatus(error, 401)) return "That code didn't work. Check it, or ask for a new one.";
  return error.message;
}

// Counts down to a deadline rather than counting ticks, because timers pause while the app is in
// the background, which is where you are while reading the code in Discord.
function useCountdown() {
  const [left, setLeft] = useState(0);
  const deadline = useRef(0);
  const running = left > 0;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const start = (seconds: number) => {
    deadline.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  };
  return [left, start] as const;
}

export default function Login() {
  const [step, setStep] = useState<"username" | "code">("username");
  const [username, setUsername] = useState(() => getSavedUsername() ?? "");
  const [code, setCode] = useState("");
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [resendIn, startResendWait] = useCountdown();
  const [verifyIn, startVerifyWait] = useCountdown();

  const name = username.trim();

  const verify = useMutation({
    mutationFn: () => signIn(name, code),
    // Only a 401 means the code was tried. It's still good after a rate limit or a network failure.
    onError: (e) => {
      if (hasStatus(e, 401)) setCode("");
      if (e instanceof ApiRequestError && e.status === 429 && e.retryAfter) {
        startVerifyWait(e.retryAfter);
      }
    },
  });

  const request = useMutation({
    mutationFn: () => requestLoginCode(name),
    onSuccess: (res) => {
      verify.reset();
      setCode("");
      setSentMessage(res.message ?? null);
      startResendWait(RESEND_SECONDS);
      setStep("code");
    },
    onError: (e) => {
      if (e instanceof ApiRequestError && e.retryAfter) startResendWait(e.retryAfter);
    },
  });

  const goToCode = () => {
    request.reset();
    setSentMessage(null);
    setStep("code");
  };

  const goToUsername = () => {
    request.reset();
    verify.reset();
    setCode("");
    setStep("username");
  };

  const canRequest = !!name && !request.isPending;
  const canVerify = code.length === CODE_LENGTH && !verify.isPending && verifyIn <= 0;
  const canResend = resendIn <= 0 && !request.isPending;

  // Each attempt replaces the other's error, so only the latest result shows.
  const submitRequest = () => {
    verify.reset();
    request.mutate();
  };
  const submitVerify = () => {
    request.reset();
    verify.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Sign in</Text>

      {step === "username" ? (
        <>
          <Text style={{ color: C.textSecondary }}>
            Enter your Discord username and we&apos;ll DM you a login code.
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Discord username"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="send"
            maxLength={64}
            onSubmitEditing={() => canRequest && submitRequest()}
            style={inputStyle}
          />
          <SubmitButton
            label={request.isPending ? "Sending…" : "Send code"}
            enabled={canRequest}
            onPress={submitRequest}
          />
          <ErrorText error={request.error} wait={resendIn} />
          <LinkButton label="I already have a code" enabled={!!name} onPress={goToCode} />
        </>
      ) : (
        <>
          <Text style={{ color: C.textSecondary }}>
            {sentMessage ?? "Enter the login code from your Discord DM."}
          </Text>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            placeholder="6-digit code"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            autoFocus
            onSubmitEditing={() => canVerify && submitVerify()}
            style={[inputStyle, { fontSize: 20, letterSpacing: 4 }]}
          />
          <SubmitButton
            label={verify.isPending ? "Signing in…" : "Sign in"}
            enabled={canVerify}
            onPress={submitVerify}
          />
          <ErrorText error={request.error} wait={resendIn} />
          <ErrorText error={verify.error} wait={verifyIn} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <LinkButton label="Change username" enabled onPress={goToUsername} />
            <LinkButton
              label={resendIn > 0 ? `Resend in ${formatWait(resendIn)}` : "Resend code"}
              enabled={canResend}
              onPress={submitRequest}
            />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 8,
  backgroundColor: C.surface,
  paddingHorizontal: 12,
  paddingVertical: 12,
};

function SubmitButton({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={!enabled}
      onPress={onPress}
      style={{
        backgroundColor: enabled ? C.accent : C.accentMuted,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 8,
      }}
    >
      <Text style={{ color: C.onAccent, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function LinkButton({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={!enabled} onPress={onPress} style={{ paddingVertical: 8 }}>
      <Text style={{ color: enabled ? C.accent : C.muted }}>{label}</Text>
    </Pressable>
  );
}

function ErrorText({ error, wait }: { error: Error | null; wait: number }) {
  const text = error && errorText(error, wait);
  return text ? <Text style={{ color: C.danger }}>{text}</Text> : null;
}
