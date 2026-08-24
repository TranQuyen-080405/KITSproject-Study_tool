import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (...parts) =>
  JSON.parse(await readFile(path.join(testRoot, ...parts), "utf8"));
const [lessonInput, vocabularyInput, questionInput, golden] = await Promise.all([
  readJson("fixtures", "inputs", "create_lesson.json"),
  readJson("fixtures", "inputs", "create_vocabulary.json"),
  readJson("fixtures", "inputs", "create_question.json"),
  readJson("fixtures", "expected_outputs", "successful_flow.json"),
]);
const baseUrl = (process.env.CONTENT_API_URL ?? "http://localhost:3001/api/v1/content").replace(
  /\/$/,
  "",
);
const exchanges = [];
const cases = [];

async function call(caseId, name, route, init = {}) {
  const headers = init.body ? { "content-type": "application/json" } : {};
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const response = await fetch(`${baseUrl}${route}`, { ...init, headers });
  const body = await response.json();
  exchanges.push({
    caseId,
    name,
    timestamp: startedAt,
    endpoint: `${baseUrl}${route}`,
    method: init.method ?? "GET",
    request: {
      headers,
      payload: init.body ? JSON.parse(init.body) : null,
    },
    response: {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    },
    executionTimeMs: Number((performance.now() - start).toFixed(2)),
  });
  return { status: response.status, body };
}

function verify(caseId, condition, details) {
  cases.push({ caseId, passed: Boolean(condition), details });
  if (!condition) throw new Error(`${caseId}: ${details}`);
}

let failure;
try {
  const lessonA = await call("TC-01", "create lesson", "/lessons", {
    method: "POST",
    body: JSON.stringify(lessonInput),
  });
  verify(
    "TC-01",
    lessonA.status === golden.cases["TC-01"].status && Boolean(lessonA.body.lesson?.id),
    `expected 201 with lesson.id, got ${lessonA.status}`,
  );

  const lessonAId = lessonA.body.lesson.id;
  const vocabularyA = await call(
    "TC-02",
    "add vocabulary",
    `/lessons/${lessonAId}/vocabularies`,
    { method: "POST", body: JSON.stringify(vocabularyInput) },
  );
  verify(
    "TC-02",
    vocabularyA.status === golden.cases["TC-02"].status &&
      vocabularyA.body.count === golden.cases["TC-02"].count &&
      vocabularyA.body.vocabulary.every(({ lessonId }) => lessonId === lessonAId),
    `expected ${golden.cases["TC-02"].count} vocabulary rows linked to lesson`,
  );

  const targetVocabulary =
    vocabularyA.body.vocabulary[questionInput.targetVocabularyIndex];
  const targetedQuestionBody = {
    prompt: questionInput.prompt,
    vocabularyId: targetVocabulary.id,
    options: questionInput.options,
    correctOptionIndex: questionInput.correctOptionIndex,
  };
  const targetedQuestion = await call(
    "TC-03",
    "create targeted question",
    `/lessons/${lessonAId}/questions`,
    { method: "POST", body: JSON.stringify(targetedQuestionBody) },
  );
  verify(
    "TC-03",
    targetedQuestion.status === golden.cases["TC-03"].status &&
      targetedQuestion.body.question.vocabularyId === targetVocabulary.id,
    "question must reference vocabulary from its lesson",
  );

  const generalQuestion = await call(
    "TC-04",
    "create general question",
    `/lessons/${lessonAId}/questions`,
    {
      method: "POST",
      body: JSON.stringify({ ...targetedQuestionBody, vocabularyId: null }),
    },
  );
  const generalCheck = await call(
    "TC-04",
    "check general question",
    `/questions/${generalQuestion.body.question.id}/check`,
    {
      method: "POST",
      body: JSON.stringify({ selectedOptionIndex: questionInput.correctOptionIndex }),
    },
  );
  verify(
    "TC-04",
    generalQuestion.status === golden.cases["TC-04"].status &&
      generalQuestion.body.question.vocabularyId === null &&
      generalCheck.body.correct === true &&
      generalCheck.body.masteryCandidateVocabularyId === null,
    "general question must succeed without producing a mastery candidate",
  );

  const lessonB = await call("SETUP", "create second lesson", "/lessons", {
    method: "POST",
    body: JSON.stringify({ ...lessonInput, name: `${lessonInput.name} B` }),
  });
  const vocabularyB = await call(
    "SETUP",
    "add vocabulary to second lesson",
    `/lessons/${lessonB.body.lesson.id}/vocabularies`,
    { method: "POST", body: JSON.stringify(vocabularyInput) },
  );

  const mismatch = await call(
    "TC-05",
    "reject cross-lesson vocabulary",
    `/lessons/${lessonAId}/questions`,
    {
      method: "POST",
      body: JSON.stringify({
        ...targetedQuestionBody,
        vocabularyId: vocabularyB.body.vocabulary[0].id,
      }),
    },
  );
  verify(
    "TC-05",
    mismatch.status === golden.cases["TC-05"].status &&
      mismatch.body.error === golden.cases["TC-05"].error,
    `expected ${golden.cases["TC-05"].status} cross-lesson rejection`,
  );

  const missing = await call(
    "TC-06",
    "reject missing vocabulary",
    `/lessons/${lessonAId}/questions`,
    {
      method: "POST",
      body: JSON.stringify({
        ...targetedQuestionBody,
        vocabularyId: "00000000-0000-0000-0000-000000000000",
      }),
    },
  );
  verify(
    "TC-06",
    missing.status === golden.cases["TC-06"].status &&
      missing.body.error === golden.cases["TC-06"].error,
    `expected ${golden.cases["TC-06"].status} missing-vocabulary rejection`,
  );

  const publicQuestions = await call(
    "CONTRACT",
    "list public questions",
    `/lessons/${lessonAId}/questions`,
  );
  verify(
    "CONTRACT",
    publicQuestions.body.questions.every(
      (question) => !Object.hasOwn(question, "correctOptionIndex"),
    ),
    "public payload must hide correctOptionIndex",
  );
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

const passed = !failure && cases.every(({ passed: casePassed }) => casePassed);
const report = {
  contractVersion: golden.contractVersion,
  runAt: new Date().toISOString(),
  baseUrl,
  passed,
  failure,
  cases,
  exchanges,
};
const reportDirectory = path.join(testRoot, "logs", "run_reports");
await mkdir(reportDirectory, { recursive: true });
const stamp = report.runAt
  .replace("T", "_")
  .replace("Z", "")
  .replaceAll("-", "_")
  .replaceAll(":", "_")
  .replace(".", "_");
await Promise.all([
  writeFile(path.join(reportDirectory, `report_${stamp}.json`), JSON.stringify(report, null, 2)),
  writeFile(path.join(reportDirectory, "report_latest.json"), JSON.stringify(report, null, 2)),
]);

console.log(
  `${passed ? "PASS" : "FAIL"}: ${cases.filter(({ passed }) => passed).length}/${cases.length} cases`,
);
if (failure) console.error(failure);
process.exitCode = passed ? 0 : 1;
