import { useState } from "react";
import { Text, View } from "react-native";
import { api, client } from "./api";
import type { AdminUser } from "./types";
import { Button, Confirm, DataStatus, Field, Heading, s, useData, useTask } from "./ui";

export function AccountScreen() {
  const load = useData(api.me);
  const task = useTask();
  const [userId, setUserId] = useState("");
  const [found, setFound] = useState<AdminUser>();
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  return <View style={s.page}><Heading eyebrow="Your space" title="Hello, learner." description="Your account and sign-in settings." />
    <DataStatus {...load} retry={load.reload}>{load.data && <>
      <View style={s.panel}><Text style={s.h2}>{load.data.displayName}</Text><Text selectable style={s.text}>@{load.data.username}</Text><Text selectable style={s.muted}>{load.data.email}</Text><Text style={s.small}>Account #{load.data.id} · {load.data.emailVerified ? "Email verified" : "Email not verified"} · {load.data.role ?? "USER"}</Text><Button tone="secondary" disabled={load.loading} onPress={load.reload}>Refresh profile</Button></View>
      <View style={s.panel}><Text style={s.h3}>Account security</Text><Text style={s.muted}>To reset a password, sign out and choose “Forgot password?”. Session refresh runs automatically while you use the app.</Text><Button disabled={task.busy} tone="secondary" onPress={() => void task.run(async () => { await client.refresh(); setNotice("Session refreshed successfully."); })}>Refresh session now</Button><Button disabled={task.busy} tone="danger" onPress={() => void task.run(async () => { await client.signOut(); })}>Sign out</Button></View>
      {load.data.role === "ADMIN" && <View style={s.panel}><Text style={s.eyebrow}>ADMIN TOOLS</Text><Text style={s.h2}>Manage a user</Text><Text style={s.muted}>Look up an account by numeric ID. Admin permissions are checked by the server.</Text><Field label="User ID" keyboardType="number-pad" value={userId} onChangeText={(value) => { setUserId(value); setFound(undefined); }} />
        <Button disabled={task.busy} onPress={() => void task.run(async () => { if (!/^\d+$/.test(userId)) throw new Error("Enter a numeric user ID."); setNotice(""); setFound(await api.user(userId)); })}>Find user</Button>
        {found && <><Text style={s.h3}>{found.displayName} · @{found.username}</Text><Text style={s.text}>{found.email}</Text><Text style={s.small}>{found.role} · {found.status}{"\n"}Created {new Date(found.createdAt).toLocaleDateString()}</Text><Button disabled={task.busy} tone="danger" onPress={() => { task.setError(""); setDeleting(true); }}>Delete this user</Button></>}
      </View>}
    </>}</DataStatus>
    {!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}{!!task.error && !deleting && <Text accessibilityRole="alert" style={s.error}>{task.error}</Text>}
    {deleting && found && <Confirm title={`Delete @${found.username}?`} detail="This permanently removes the user account. This action cannot be undone." busy={task.busy} error={task.error} onCancel={() => setDeleting(false)} onConfirm={() => void task.run(async () => { const self = found.id === load.data?.id; await api.deleteUser(String(found.id)); setFound(undefined); setDeleting(false); setNotice("User deleted."); if (self) await client.signOut(); })} />}
  </View>;
}
