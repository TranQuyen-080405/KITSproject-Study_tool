import type { TestSession } from "../api/deck-tests-api";

export function testDraftKey(session: Pick<TestSession, "id" | "userId">): string {
  return `haru-deck-test-draft:${session.userId}:${session.id}`;
}

export function restoreTestDraft(session: TestSession): Array<number | null> {
  if (session.completedAt) return [...session.answers];
  try {
    const raw = localStorage.getItem(testDraftKey(session));
    if (!raw) return [...session.answers];
    const draft = JSON.parse(raw) as { answers?: unknown };
    if (!Array.isArray(draft.answers) || draft.answers.length !== session.questions.length) return [...session.answers];
    let gap = false;
    for (let index = 0; index < draft.answers.length; index++) {
      const answer = draft.answers[index];
      if (answer === null) { gap = true; continue; }
      if (gap || !Number.isInteger(answer) || answer < 0 || answer >= session.questions[index].options.length) {
        return [...session.answers];
      }
    }
    // The server is authoritative for choices already acknowledged.
    const localAnswers = draft.answers as Array<number | null>;
    return session.answers.map((answer, index) => answer ?? localAnswers[index]);
  } catch {
    return [...session.answers];
  }
}

export function saveTestDraft(session: TestSession, answers: Array<number | null>): boolean {
  try {
    localStorage.setItem(testDraftKey(session), JSON.stringify({ answers }));
    return true;
  } catch { return false; }
}

export function clearTestDraft(session: TestSession): void {
  try { localStorage.removeItem(testDraftKey(session)); } catch { /* Storage may be disabled. */ }
}
