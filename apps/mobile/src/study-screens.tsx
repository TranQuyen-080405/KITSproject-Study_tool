import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { api } from "./api";
import type { Navigate } from "./navigation";
import type { Card, Question } from "./types";
import { shuffle } from "./study";
import { Button, color, DataStatus, Empty, Heading, s, useData } from "./ui";

export function StudyHome({ navigate }: { navigate: Navigate }) {
  return <View style={s.page}><Heading eyebrow="A moment to focus" title={"What will you\nlearn today?"} description="Go through your entire collection, or open a deck in your library to focus on one topic." />
    <View style={s.hero}><Text style={s.heroTitle}>One card. One small discovery.</Text><Text style={s.heroText}>Flip each flashcard, check your memory, and revisit anything that needs another look.</Text><Button tone="accent" onPress={() => navigate({ name: "study", kind: "cards" })}>Study all flashcards</Button></View>
    <View style={s.panel}><Text style={s.eyebrow}>PUT IT INTO PRACTICE</Text><Text style={s.h2}>Test what you know.</Text><Text style={s.muted}>Work through all your manual questions, see the correct answers, and retry the ones you missed.</Text><Button onPress={() => navigate({ name: "study", kind: "questions" })}>Practice all questions</Button></View>
    <Text style={s.small}>See your results after each round. Start a fresh round whenever you like.</Text><Button tone="secondary" onPress={() => navigate({ name: "library" })}>Choose a single deck</Button>
  </View>;
}

export function StudyScreen({ kind, deckId, done }: { kind: "cards" | "questions"; deckId?: string; done(): void }) {
  const load = useData(() => api.studyBank(kind, deckId), [kind, deckId]);
  const [random, setRandom] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [started, setStarted] = useState(false);
  const items = kind === "cards" ? load.data?.cards : load.data?.questions;
  return <View style={s.page}><DataStatus {...load} retry={load.reload}>
    {!items?.length ? <><Heading eyebrow="Practice" title="Nothing to study yet." /><Empty title={kind === "cards" ? "No flashcards here" : "No questions here"}>Create some items in your library, then come back when you are ready.</Empty><Button onPress={done}>Back</Button></> : !started ? <>
      <Heading eyebrow={deckId ? "Single deck practice" : "Your whole collection"} title={kind === "cards" ? "Take it card\nby card." : "Give it your\nbest answer."} description={`${items.length} ${kind === "cards" ? "flashcards" : "questions"} ready for you. Every item appears once per round.`} />
      <View style={s.panel}><View style={s.between}><Text style={s.text}>Shuffle order</Text><Switch accessibilityLabel="Shuffle order" value={random} onValueChange={setRandom} trackColor={{ true: "#ACC88F" }} /></View>
        {kind === "cards" && <View style={s.between}><Text style={s.text}>Show the back first</Text><Switch accessibilityLabel="Show the back first" value={reverse} onValueChange={setReverse} trackColor={{ true: "#ACC88F" }} /></View>}
        <Text style={s.muted}>{kind === "cards" ? "Tap a card to reveal the other side. Choose “Got it” or “Review again” after checking your answer." : "Choose one of four answers, check it, and see the correct answer before moving on."}</Text><Button onPress={() => setStarted(true)}>Start practice</Button>
      </View>
    </> : <StudySession kind={kind} original={items} random={random} reverse={reverse} done={done} />}
  </DataStatus></View>;
}

function StudySession({ kind, original, random, reverse, done }: { kind: "cards" | "questions"; original: (Card | Question)[]; random: boolean; reverse: boolean; done(): void }) {
  const [items, setItems] = useState(() => random ? shuffle(original) : [...original]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number>();
  const [checked, setChecked] = useState(false);
  const [missed, setMissed] = useState<(Card | Question)[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const item = items[index];
  function advance(correct: boolean) {
    if (correct) setCorrectCount((value) => value + 1); else setMissed((value) => [...value, item]);
    if (index + 1 === items.length) setComplete(true); else setIndex((value) => value + 1);
    setRevealed(false); setSelected(undefined); setChecked(false);
  }
  function restart(next: (Card | Question)[]) {
    setItems(random ? shuffle(next) : [...next]); setIndex(0); setRevealed(false); setSelected(undefined); setChecked(false); setMissed([]); setCorrectCount(0); setComplete(false);
  }
  if (complete) return <><Heading eyebrow="Practice complete" title={"A little more\nthan yesterday."} description={`You went through every ${kind === "cards" ? "flashcard" : "question"} in this round.`} />
    <View style={s.hero}><Text style={[s.heroTitle, { fontSize: 48, lineHeight: 56 }]}>{correctCount} / {items.length}</Text><Text style={s.heroText}>{kind === "cards" ? "Marked as remembered" : "Answered correctly"} · {Math.round(correctCount / items.length * 100)}%</Text></View>
    {missed.length > 0 ? <View style={s.panel}><Text style={s.h2}>Keep the momentum.</Text><Text style={s.muted}>{missed.length} items to try again.</Text><Button tone="accent" onPress={() => restart(missed)}>Retry missed items</Button></View> : <Text style={s.notice}>You got every item in this round. Nicely done!</Text>}
    <Button onPress={() => restart(original)}>Restart full practice</Button><Button tone="secondary" onPress={done}>Finish</Button></>;
  const question = item as Question;
  const card = item as Card;
  return <><Heading eyebrow={kind === "cards" ? "Flashcard practice" : "Question practice"} title={`${index + 1} of ${items.length}`} />
    <View accessibilityLabel={`${index} of ${items.length} completed`} style={{ height: 6, borderRadius: 4, backgroundColor: color.line }}><View style={{ height: 6, borderRadius: 4, backgroundColor: color.ink, width: `${index / items.length * 100}%` }} /></View><Text style={s.small}>{item.deckTitle}</Text>
    {kind === "cards" ? <>
      <Pressable accessibilityRole="button" accessibilityLabel={revealed ? "Show front of flashcard" : "Reveal flashcard answer"} onPress={() => setRevealed((value) => !value)} style={[s.panel, { minHeight: 270, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: revealed ? color.soft : color.white }]}>
        <Text style={s.eyebrow}>{revealed ? "ANSWER" : reverse ? "BACK" : "FRONT"}</Text><Text style={[s.title, { textAlign: "center", fontSize: 34, lineHeight: 44 }]}>{revealed ? (reverse ? card.front : card.back) : reverse ? card.back : card.front}</Text>
        {!revealed && !!card.hint && <Text style={[s.muted, { textAlign: "center" }]}>Hint: {card.hint}</Text>}<Text style={s.small}>Tap to flip</Text>
      </Pressable>
      {!revealed ? <Button onPress={() => setRevealed(true)}>Reveal answer</Button> : <><Button tone="accent" onPress={() => advance(true)}>Got it</Button><Button tone="secondary" onPress={() => advance(false)}>Review again</Button></>}
    </> : <>
      <View style={s.panel}><Text style={[s.h2, { lineHeight: 31 }]}>{question.prompt}</Text></View>
      {question.options.map((option, i) => <Pressable key={i} disabled={checked} accessibilityRole="radio" accessibilityState={{ checked: selected === i, disabled: checked }} onPress={() => setSelected(i)} style={[s.option, { backgroundColor: checked && i === question.correctOptionIndex ? color.lime : checked && selected === i ? "#F9E7E3" : selected === i ? color.soft : color.white, borderColor: selected === i ? color.ink : color.line }]}><Text style={[s.h3, { width: 22 }]}>{checked && i === question.correctOptionIndex ? "✓" : String.fromCharCode(65 + i)}</Text><Text style={[s.text, s.grow]}>{option}</Text></Pressable>)}
      {checked && <Text accessibilityRole="alert" style={selected === question.correctOptionIndex ? s.notice : s.error}>{selected === question.correctOptionIndex ? "That's right!" : `Correct answer: ${question.options[question.correctOptionIndex]}`}</Text>}
      <Button disabled={selected === undefined} onPress={() => checked ? advance(selected === question.correctOptionIndex) : setChecked(true)}>{checked ? index + 1 === items.length ? "See results" : "Next question" : "Check answer"}</Button>
    </>}
    <Text style={[s.small, { textAlign: "center" }]}>{kind === "cards" ? "Take your time. Learning is a practice." : "Every attempt helps it stick."}</Text></>;
}
