import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { api, apiUrl } from "./api";
import { ApiError } from "./http";
import { Button, Field, Heading, s, useTask } from "./ui";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";
const titles: Record<Mode, string> = { login: "A little practice.\nA little progress.", register: "Make room\nfor learning.", verify: "Check your inbox.", forgot: "Let's get you\nback in.", reset: "A fresh start." };

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const task = useTask();
  function change(next: Mode) { setMode(next); task.setError(""); setNotice(""); setCode(""); setPassword(""); }
  async function submit() {
    await task.run(async () => {
      if ((mode === "login" || mode === "register") && !username.trim()) throw new Error("Enter your username.");
      if (mode !== "login" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Enter a valid email address.");
      if (mode === "register" && (!/^[A-Za-z0-9_.-]{3,50}$/.test(username.trim()) || !displayName.trim())) throw new Error("Enter your display name and a username of 3–50 letters, numbers, dots, dashes or underscores.");
      if (["register", "reset"].includes(mode) && password.length < 8) throw new Error("Use a password with at least 8 characters.");
      if (["verify", "reset"].includes(mode) && !/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from your email.");
      const address = email.trim().toLowerCase();
      if (mode === "login") {
        try { await api.login(username.trim(), password); }
        catch (e) {
          if (e instanceof ApiError && e.code === "EMAIL_NOT_VERIFIED") setNotice("Verify your email using the link below, then sign in again.");
          throw e;
        }
      }
      if (mode === "register") {
        await api.register({ username: username.trim(), email: address, password, displayName: displayName.trim() });
        change("verify"); setNotice("Account created. Enter the six-digit code sent to your email.");
      }
      if (mode === "verify") { await api.verify(address, code); change("login"); setNotice("Email verified. You can sign in now."); }
      if (mode === "forgot") { await api.forgot(address); change("reset"); setNotice("Check your email for the password reset code."); }
      if (mode === "reset") { await api.reset(address, code, password); change("login"); setNotice("Password updated. Sign in with your new password."); }
    });
  }
  async function google() {
    await task.run(async () => {
      if (Platform.OS !== "android") throw new Error("Google sign-in is available in the Android app. Use username and password in the browser preview.");
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!webClientId) throw new Error("Google sign-in needs an OAuth client ID. Follow the Google setup in apps/mobile/README.md. Username sign-in is ready to use.");
      // Loaded only on demand so password sign-in also works in Expo Go.
      let googleModule: typeof import("@react-native-google-signin/google-signin");
      try { googleModule = require("@react-native-google-signin/google-signin"); }
      catch { throw new Error("Google sign-in needs the Android development build. Run pnpm --filter @korean-learning/mobile android."); }
      googleModule.GoogleSignin.configure({ webClientId });
      await googleModule.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await googleModule.GoogleSignin.signIn();
      if (result.type !== "success") return;
      if (!result.data.idToken) throw new Error("Google did not return an ID token. Check the Web OAuth client ID.");
      await api.google(result.data.idToken);
    });
  }
  return <View style={s.page}>
    <Heading eyebrow="Your everyday study companion" title={titles[mode]} description={mode === "login" ? "Your words. Your questions. Your pace." : "Keep your account secure and your study materials together."} />
    <View style={s.panel}>
      <Text style={s.h2}>{{ login: "Welcome back", register: "Create an account", verify: "Verify email", forgot: "Forgot password", reset: "Reset password" }[mode]}</Text>
      {!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {(mode === "login" || mode === "register") && <Field label="Username" value={username} onChangeText={setUsername} autoComplete="username" maxLength={50} />}
      {mode === "register" && <Field label="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" maxLength={100} />}
      {mode !== "login" && <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />}
      {(mode === "verify" || mode === "reset") && <Field label="Six-digit email code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />}
      {["login", "register", "reset"].includes(mode) && <>
        <Field label={mode === "reset" ? "New password" : "Password"} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <Button tone="secondary" disabled={task.busy} onPress={() => setShowPassword((value) => !value)}>{showPassword ? "Hide password" : "Show password"}</Button>
      </>}
      {!!task.error && <Text accessibilityRole="alert" style={s.error}>{task.error}</Text>}
      <Button disabled={task.busy} onPress={() => void submit()}>{task.busy ? "Please wait…" : ({ login: "Sign in", register: "Create account", verify: "Verify email", forgot: "Send reset code", reset: "Save new password" }[mode])}</Button>
      {mode === "login" && <>
        <Button disabled={task.busy} tone="secondary" onPress={() => void google()}>Continue with Google</Button>
        <View style={s.divider} />
        <Button disabled={task.busy} tone="accent" onPress={() => change("register")}>Create an account</Button>
        <Button disabled={task.busy} tone="secondary" onPress={() => change("forgot")}>Forgot password?</Button>
        <Button disabled={task.busy} tone="secondary" onPress={() => change("verify")}>Verify an existing account</Button>
      </>}
      {mode !== "login" && <Button disabled={task.busy} tone="secondary" onPress={() => change("login")}>Back to sign in</Button>}
    </View>
    {__DEV__ && <Text selectable style={s.small}>Local development · {apiUrl}{"\n"}Seeded account: test / test1234{"\n"}Email codes: open localhost:8025 on your laptop.</Text>}
  </View>;
}
