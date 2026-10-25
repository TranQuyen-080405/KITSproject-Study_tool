import { useEffect, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";
import { client } from "./api";
import { AccountScreen } from "./account-screen";
import { AuthScreen } from "./auth-screens";
import { CardEditor, DeckEditor, DeckScreen, LibraryScreen, QuestionEditor } from "./content-screens";
import { StudyHome, StudyScreen } from "./study-screens";
import type { Route } from "./navigation";
import type { Session } from "./types";
import { Button, color, Loading, s } from "./ui";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [stack, setStack] = useState<Route[]>([{ name: "library" }]);
  const [revision, setRevision] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const route = stack[stack.length - 1];
  async function boot() {
    setBooting(true); setBootError("");
    try { setSession(await client.restore()); }
    catch (error) {
      if (client.getSession()) setBootError(error instanceof Error ? error.message : "Could not restore your session.");
    }
    finally { setBooting(false); }
  }
  useEffect(() => {
    const unsubscribe = client.subscribe((value) => {
      setSession(value);
      if (!value) setStack([{ name: "library" }]);
    });
    void boot();
    return unsubscribe;
  }, []);
  function navigate(next: Route) {
    if (next.name === "library" || next.name === "study-home" || next.name === "account") setStack([next]);
    else setStack((old) => [...old, next]);
    setRevision((old) => old + 1);
  }
  function back() {
    setStack((old) => {
      if (old.length <= 1) return [{ name: "library" }];
      const next = old.slice(0, -1);
      const parent = next[next.length - 1];
      const leaving = old[old.length - 1];
      if (parent.name === "deck" && (leaving.name === "edit-question" || leaving.name === "edit-card")) {
        next[next.length - 1] = { ...parent, tab: leaving.name === "edit-question" ? "questions" : "cards" };
      }
      return next;
    });
    setRevision((old) => old + 1);
  }
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) { back(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [stack.length]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [revision, !!session]);

  let screen;
  if (booting) screen = <Loading />;
  else if (bootError) screen = <View style={s.page}><Text style={s.error}>{bootError}</Text><Button onPress={() => void boot()}>Retry connection</Button><Button tone="secondary" onPress={() => { void client.signOut().catch(() => {}); setBootError(""); }}>Clear local session</Button></View>;
  else if (!session) screen = <AuthScreen />;
  else switch (route.name) {
    case "library": screen = <LibraryScreen navigate={navigate} />; break;
    case "study-home": screen = <StudyHome navigate={navigate} />; break;
    case "account": screen = <AccountScreen />; break;
    case "deck": screen = <DeckScreen deckId={route.id} initialTab={route.tab} navigate={navigate} back={back} />; break;
    case "edit-deck": screen = <DeckEditor deck={route.deck} done={back} />; break;
    case "edit-card": screen = <CardEditor deckId={route.deckId} card={route.card} done={back} />; break;
    case "edit-question": screen = <QuestionEditor deckId={route.deckId} question={route.question} done={back} />; break;
    case "study": screen = <StudyScreen kind={route.kind} deckId={route.deckId} done={back} />; break;
  }
  const activeTab = route.name === "account" ? "account" : route.name === "study-home" || route.name === "study" ? "study-home" : "library";
  return <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
    <StatusBar barStyle="dark-content" backgroundColor={color.paper} />
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, width: "100%", maxWidth: 600, alignSelf: "center", borderLeftWidth: Platform.OS === "web" ? 1 : 0, borderRightWidth: Platform.OS === "web" ? 1 : 0, borderColor: color.line }}>
        <View style={[s.between, { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderColor: color.line }]}>
          <View style={s.row}><View style={{ backgroundColor: color.ink, borderRadius: 10, width: 35, height: 35, justifyContent: "center", alignItems: "center" }}><Text style={{ color: color.lime, fontWeight: "800", fontSize: 21 }}>h</Text></View><Text style={[s.h3, { letterSpacing: 1 }]}>haru<Text style={{ color: color.muted, fontWeight: "400" }}> study</Text></Text></View>
          {!!session && stack.length > 1 ? <Button tone="secondary" onPress={back}>‹ Back</Button> : <Text style={s.eyebrow}>하루</Text>}
        </View>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}><View key={`${session?.user.id ?? "guest"}-${revision}`} style={{ flex: 1 }}>{screen}</View></ScrollView>
        {!!session && !booting && !bootError && <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: color.line, backgroundColor: color.white, paddingTop: 9, paddingBottom: 12 }}>
          {([{ name: "library", label: "Library", symbol: "▤" }, { name: "study-home", label: "Practice", symbol: "◇" }, { name: "account", label: "Account", symbol: "○" }] as const).map((tab) => <Pressable key={tab.name} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.name }} onPress={() => navigate({ name: tab.name })} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 6 }}><Text style={{ color: activeTab === tab.name ? color.ink : "#929C94", fontSize: 23 }}>{tab.symbol}</Text><Text style={{ color: activeTab === tab.name ? color.ink : color.muted, fontSize: 11, fontWeight: activeTab === tab.name ? "700" : "400" }}>{tab.label}</Text></Pressable>)}
        </View>}
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
