import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

export const color = { ink: "#173C38", muted: "#64746D", paper: "#F6F5EF", white: "#FFFFFF", line: "#DEE4DA", lime: "#DEEDAA", soft: "#EAF0E7", red: "#A33A36" };
export const s = StyleSheet.create({
  page: { padding: 24, paddingBottom: 36, gap: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  grow: { flex: 1 },
  eyebrow: { color: color.muted, fontWeight: "700", fontSize: 11, letterSpacing: 2 },
  title: { color: color.ink, fontWeight: "800", fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  h2: { color: color.ink, fontWeight: "700", fontSize: 22, lineHeight: 28 },
  h3: { color: color.ink, fontWeight: "700", fontSize: 17 },
  text: { color: color.ink, fontSize: 15, lineHeight: 23 },
  muted: { color: color.muted, fontSize: 14, lineHeight: 21 },
  small: { color: color.muted, fontSize: 12, lineHeight: 18 },
  panel: { backgroundColor: color.white, borderColor: color.line, borderWidth: 1, borderRadius: 22, padding: 20, gap: 14 },
  hero: { backgroundColor: color.ink, borderRadius: 24, padding: 24, gap: 16 },
  heroTitle: { color: color.white, fontSize: 29, lineHeight: 35, fontWeight: "700", letterSpacing: -0.5 },
  heroText: { color: "#CFDCD3", fontSize: 14, lineHeight: 22 },
  pill: { backgroundColor: color.soft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" },
  field: { gap: 7 },
  label: { color: color.ink, fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: color.line, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, minHeight: 50, backgroundColor: color.white, color: color.ink, fontSize: 16 },
  button: { minHeight: 49, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, alignItems: "center", justifyContent: "center", backgroundColor: color.ink },
  buttonText: { color: color.white, fontSize: 14, fontWeight: "700", textAlign: "center" },
  secondary: { backgroundColor: color.soft },
  accent: { backgroundColor: color.lime },
  danger: { backgroundColor: "#F9E7E3" },
  error: { color: color.red, backgroundColor: "#FFF0EC", padding: 14, borderRadius: 12, fontSize: 14, lineHeight: 21 },
  notice: { color: color.ink, backgroundColor: color.soft, padding: 14, borderRadius: 12, fontSize: 14, lineHeight: 21 },
  divider: { height: 1, backgroundColor: color.line, marginVertical: 2 },
  option: { borderWidth: 1, borderColor: color.line, borderRadius: 15, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
});

export function Button({ children, onPress, disabled, tone = "primary", accessibilityLabel }: { children: string; onPress(): void; disabled?: boolean; tone?: "primary" | "secondary" | "accent" | "danger"; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? children} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, tone === "secondary" && s.secondary, tone === "accent" && s.accent, tone === "danger" && s.danger, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    <Text style={[s.buttonText, tone !== "primary" && { color: tone === "danger" ? color.red : color.ink }]}>{children}</Text>
  </Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#8E9A91" autoCapitalize="none" {...props} style={[s.input, props.multiline && { minHeight: 94, textAlignVertical: "top" }, props.style]} /></View>;
}

export function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <View style={{ gap: 9 }}><Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text><Text accessibilityRole="header" style={s.title}>{title}</Text>{!!description && <Text style={s.muted}>{description}</Text>}</View>;
}

export function Empty({ title, children }: { title: string; children: string }) {
  return <View style={[s.panel, { paddingVertical: 30 }]}><Text style={s.h2}>{title}</Text><Text style={s.muted}>{children}</Text></View>;
}

export function Loading() { return <View style={{ padding: 36, gap: 15 }}><ActivityIndicator color={color.ink} /><Text style={[s.muted, { textAlign: "center" }]}>Getting things ready…</Text></View>; }

export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setError(""); setBusy(true);
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return { busy, error, setError, run };
}

export function useData<T>(load: () => Promise<T>, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    load().then((value) => { if (alive) setData(value); }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Could not load data."); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [...deps, revision]);
  return { data, error, loading, reload: () => setRevision((value) => value + 1) };
}

export function DataStatus({ loading, error, retry, children }: { loading: boolean; error: string; retry(): void; children: ReactNode }) {
  if (loading) return <Loading />;
  if (error) return <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button onPress={retry} tone="secondary">Try again</Button></View>;
  return <>{children}</>;
}

export function Confirm({ title, detail, onConfirm, onCancel, busy = false, error }: { title: string; detail: string; onConfirm(): void; onCancel(): void; busy?: boolean; error?: string }) {
  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={{ flex: 1, justifyContent: "center", padding: 26, backgroundColor: "#102B30AA" }}><View style={[s.panel, { maxWidth: 440, width: "100%", alignSelf: "center" }]}>
      <Text style={s.h2}>{title}</Text><Text style={s.muted}>{detail}</Text>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Button disabled={busy} tone="danger" onPress={onConfirm}>{busy ? "Deleting…" : "Delete permanently"}</Button><Button disabled={busy} tone="secondary" onPress={onCancel}>Cancel</Button>
    </View></View>
  </Modal>;
}
