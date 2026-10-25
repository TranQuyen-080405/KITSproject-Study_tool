import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "./api";
import type { Navigate } from "./navigation";
import type { Card, Deck, Question } from "./types";
import { validateQuestion } from "./study";
import { Button, color, Confirm, DataStatus, Empty, Field, Heading, s, useData, useTask } from "./ui";

export function LibraryScreen({ navigate }: { navigate: Navigate }) {
  const load = useData(api.decks);
  const [search, setSearch] = useState("");
  const filtered = load.data?.filter((deck) => `${deck.title} ${deck.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <View style={s.page}>
    <Heading eyebrow="Your collection" title={"Small steps,\nlasting knowledge."} description="A quiet place for everything you want to learn." />
    <View style={s.hero}><Text style={s.heroTitle}>Make it yours.</Text><Text style={s.heroText}>Build a deck by hand. Add your words and questions, then practice a little every day.</Text><Button tone="accent" onPress={() => navigate({ name: "edit-deck" })}>+ Create a deck</Button></View>
    <View style={s.between}><Text style={s.h2}>My decks{load.data ? ` · ${load.data.length}` : ""}</Text><Button tone="secondary" disabled={load.loading} onPress={load.reload}>Refresh</Button></View>
    <Field label="Find a deck" placeholder="Search your collection" value={search} onChangeText={setSearch} />
    <DataStatus {...load} retry={load.reload}>
      {load.data?.length === 0 && <Empty title="Your first deck starts here">Tap “Create a deck” to add flashcards and four-choice questions manually.</Empty>}
      {!!load.data?.length && filtered?.length === 0 && <Empty title="No matching decks">Try a different search.</Empty>}
      {filtered?.map((deck, index) => <Pressable key={deck.id} accessibilityRole="button" accessibilityLabel={`Open ${deck.title}`} onPress={() => navigate({ name: "deck", id: deck.id })} style={({ pressed }) => [s.panel, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={s.between}><View style={[s.pill, { backgroundColor: index % 2 ? "#EEE9E1" : color.soft }]}><Text style={s.small}>DECK {String(index + 1).padStart(2, "0")}</Text></View><Text style={[s.h2, { color: color.muted }]}>↗</Text></View>
        <Text style={s.h2}>{deck.title}</Text>{!!deck.description && <Text numberOfLines={2} style={s.muted}>{deck.description}</Text>}
        <Text style={s.small}>{deck.cardCount ?? 0} flashcards   ·   {deck.questionCount ?? 0} questions</Text>
      </Pressable>)}
    </DataStatus>
  </View>;
}

export function DeckScreen({ deckId, navigate, back, initialTab = "cards" }: { deckId: string; navigate: Navigate; back(): void; initialTab?: "cards" | "questions" }) {
  const load = useData(async () => { const [deck, questions] = await Promise.all([api.deck(deckId), api.questions(deckId)]); return { deck, questions }; }, [deckId]);
  const [tab, setTab] = useState<"cards" | "questions">(initialTab);
  const [deleting, setDeleting] = useState<{ kind: "deck" | "card" | "question"; id: string }>();
  const task = useTask();
  function confirmDelete(kind: "deck" | "card" | "question", id: string) { task.setError(""); setDeleting({ kind, id }); }
  async function remove() {
    if (!deleting) return;
    await task.run(async () => {
      if (deleting.kind === "deck") { await api.deleteDeck(deleting.id); back(); }
      else { if (deleting.kind === "card") await api.deleteCard(deleting.id); else await api.deleteQuestion(deleting.id); load.reload(); }
      setDeleting(undefined);
    });
  }
  return <View style={s.page}>
    <DataStatus {...load} retry={load.reload}>
      {load.data && <>
        <Heading eyebrow="Inside your deck" title={load.data.deck.title} description={load.data.deck.description ?? undefined} />
        <View style={s.row}><Button tone="secondary" onPress={() => navigate({ name: "edit-deck", deck: load.data!.deck })}>Edit deck</Button><Button tone="danger" onPress={() => confirmDelete("deck", deckId)}>Delete deck</Button></View>
        <View style={s.hero}><Text style={s.heroTitle}>Ready when you are.</Text><Text style={s.heroText}>{load.data.deck.cards?.length ?? 0} flashcards · {load.data.questions.length} questions</Text>
          <Button tone="accent" disabled={!load.data.deck.cards?.length} onPress={() => navigate({ name: "study", kind: "cards", deckId })}>Study these flashcards</Button>
          <Button tone="accent" disabled={!load.data.questions.length} onPress={() => navigate({ name: "study", kind: "questions", deckId })}>Practice these questions</Button>
        </View>
        <View style={s.row}><Button tone={tab === "cards" ? "primary" : "secondary"} onPress={() => setTab("cards")}>Flashcards</Button><Button tone={tab === "questions" ? "primary" : "secondary"} onPress={() => setTab("questions")}>Questions</Button></View>
        <Button tone="accent" onPress={() => navigate(tab === "cards" ? { name: "edit-card", deckId } : { name: "edit-question", deckId })}>{tab === "cards" ? "+ Add a flashcard" : "+ Add a question"}</Button>
        {tab === "cards" && <>
          {!load.data.deck.cards?.length && <Empty title="Add your first word">Write a Korean word on the front and its meaning on the back. You can add a hint, too.</Empty>}
          {load.data.deck.cards?.map((card, index) => <View key={card.id} style={s.panel}>
            <Text style={s.eyebrow}>CARD {index + 1}</Text><Text style={s.h2}>{card.front}</Text><Text style={s.text}>{card.back}</Text>{!!card.hint && <Text style={s.muted}>Hint: {card.hint}</Text>}
            <View style={s.row}><Button tone="secondary" onPress={() => navigate({ name: "edit-card", deckId, card })}>Edit card</Button><Button tone="danger" accessibilityLabel={`Delete card ${card.front}`} onPress={() => confirmDelete("card", card.id)}>Delete</Button></View>
          </View>)}
        </>}
        {tab === "questions" && <>
          {!load.data.questions.length && <Empty title="Give yourself a question">Add a prompt, four choices, and the correct answer. Questions can exist without flashcards.</Empty>}
          {load.data.questions.map((question, index) => <View key={question.id} style={s.panel}>
            <Text style={s.eyebrow}>QUESTION {index + 1}</Text><Text style={s.h3}>{question.prompt}</Text>
            {question.options.map((option, i) => <Text key={i} style={[s.text, i === question.correctOptionIndex && { fontWeight: "700" }]}>{i === question.correctOptionIndex ? "✓" : String.fromCharCode(65 + i) + "."} {option}</Text>)}
            <View style={s.row}><Button tone="secondary" onPress={() => navigate({ name: "edit-question", deckId, question })}>Edit question</Button><Button tone="danger" accessibilityLabel={`Delete question ${index + 1}`} onPress={() => confirmDelete("question", question.id)}>Delete</Button></View>
          </View>)}
        </>}
      </>}
    </DataStatus>
    {!!deleting && <Confirm title={`Delete this ${deleting.kind}?`} detail={deleting.kind === "deck" ? "This will permanently delete the deck, all its flashcards, and all its questions." : "This item will be permanently removed from your deck."} busy={task.busy} error={task.error} onConfirm={() => void remove()} onCancel={() => setDeleting(undefined)} />}
  </View>;
}

export function DeckEditor({ deck, done }: { deck?: Deck; done(): void }) {
  const [title, setTitle] = useState(deck?.title ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const task = useTask();
  return <View style={s.page}><Heading eyebrow="Made by you" title={deck ? "Edit your deck." : "Start a new deck."} description="Give your collection a name. Add flashcards or questions after saving." />
    <View style={s.panel}><Field label="Deck title" placeholder="e.g. Everyday Korean" value={title} onChangeText={setTitle} maxLength={120} autoCapitalize="sentences" /><Field label="Description (optional)" placeholder="What would you like to learn?" value={description} onChangeText={setDescription} maxLength={1000} multiline autoCapitalize="sentences" />
      {!!task.error && <Text accessibilityRole="alert" style={s.error}>{task.error}</Text>}
      <Button disabled={task.busy} onPress={() => void task.run(async () => { if (!title.trim()) throw new Error("Give your deck a title."); await api.saveDeck({ title: title.trim(), description: description.trim() }, deck?.id); done(); })}>{task.busy ? "Saving…" : "Save deck"}</Button>
    </View></View>;
}

export function CardEditor({ deckId, card, done }: { deckId: string; card?: Card; done(): void }) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [hint, setHint] = useState(card?.hint ?? "");
  const task = useTask();
  return <View style={s.page}><Heading eyebrow="One word at a time" title={card ? "Edit flashcard." : "Create a flashcard."} description="Keep it simple: a word, its meaning, and an optional hint." />
    <View style={s.panel}><Field label="Front · word or prompt" placeholder="안녕하세요" value={front} onChangeText={setFront} maxLength={500} multiline /><Field label="Back · meaning or answer" placeholder="Hello" value={back} onChangeText={setBack} maxLength={2000} multiline /><Field label="Hint (optional)" value={hint} onChangeText={setHint} maxLength={500} />
      {!!task.error && <Text accessibilityRole="alert" style={s.error}>{task.error}</Text>}
      <Button disabled={task.busy} onPress={() => void task.run(async () => { if (!front.trim() || !back.trim()) throw new Error("Fill in both sides of the flashcard."); await api.saveCard(deckId, { front: front.trim(), back: back.trim(), hint: hint.trim() }, card?.id); done(); })}>{task.busy ? "Saving…" : "Save flashcard"}</Button>
    </View></View>;
}

export function QuestionEditor({ deckId, question, done }: { deckId: string; question?: Question; done(): void }) {
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [options, setOptions] = useState(question?.options ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState(question?.correctOptionIndex ?? -1);
  const task = useTask();
  return <View style={s.page}><Heading eyebrow="Practice your way" title={question ? "Edit question." : "Write a question."} description="Add four distinct choices, then mark the correct answer." />
    <View style={s.panel}><Field label="Question" value={prompt} onChangeText={setPrompt} placeholder="What does 감사합니다 mean?" maxLength={500} multiline />
      {options.map((option, index) => <View key={index} style={{ gap: 8 }}><Field label={`Answer ${String.fromCharCode(65 + index)}`} value={option} maxLength={300} onChangeText={(text) => setOptions((old) => old.map((value, i) => i === index ? text : value))} />
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: correct === index }} onPress={() => setCorrect(index)} style={[s.option, correct === index && { backgroundColor: color.lime, borderColor: color.ink }]}><Text style={s.text}>{correct === index ? "● Correct answer" : "○ Mark as correct"}</Text></Pressable></View>)}
      {!!task.error && <Text accessibilityRole="alert" style={s.error}>{task.error}</Text>}
      <Button disabled={task.busy} onPress={() => void task.run(async () => { const error = validateQuestion(prompt, options, correct); if (error) throw new Error(error); await api.saveQuestion(deckId, { prompt: prompt.trim(), options: options.map((option) => option.trim()), correctOptionIndex: correct }, question?.id); done(); })}>{task.busy ? "Saving…" : "Save question"}</Button>
    </View></View>;
}
