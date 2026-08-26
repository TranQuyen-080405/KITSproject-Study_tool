import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

export type PublicLessonAnswer = {
  answerId: string;
  answerText: string;
};

export type PublicLessonQuestion = {
  questionId: string;
  questionText: string;
  answerOptions: PublicLessonAnswer[];
};

export type PublicLessonSummary = {
  lessonId: string;
  lessonTitle: string;
  lessonDescription: string;
  vocabularyCount: number;
  questionCount: number;
};

export type PublicLessonDetail = {
  lessonId: string;
  lessonTitle: string;
  lessonDescription: string;
  lessonQuestions: PublicLessonQuestion[];
};

export type ContentVocabulary = {
  id: string;
  lessonId: string;
  word: string;
  meaning: string;
};

export type ManagedQuestion = {
  id: string;
  lessonId: string;
  vocabularyId: string | null;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
};

export type LessonInput = {
  name: string;
  description: string;
};

export type QuestionInput = {
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  vocabularyId?: string | null;
};

type ContentLessonSummary = {
  id: string;
  name: string;
  description: string;
  vocabularyCount: number;
  questionCount: number;
};

type ContentQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

type ContentLessonDetail = {
  id: string;
  name: string;
  description: string;
  questions: ContentQuestion[];
};

function mapQuestion(question: ContentQuestion): PublicLessonQuestion {
  return {
    questionId: question.id,
    questionText: question.prompt,
    answerOptions: question.options.map((answerText, index) => ({
      answerId: String(index),
      answerText,
    })),
  };
}

function asStringOptions(options: unknown): string[] {
  return Array.isArray(options) ? options.map(String) : [];
}

function mapManagedQuestion(question: ManagedQuestion & { options: unknown }): ManagedQuestion {
  return {
    ...question,
    options: asStringOptions(question.options),
  };
}

export async function fetchLessonSummaries(): Promise<PublicLessonSummary[]> {
  const body = await apiRequest<{ lessons: ContentLessonSummary[] }>(
    endpoints.content.lessons,
  );
  return body.lessons.map((lesson) => ({
    lessonId: lesson.id,
    lessonTitle: lesson.name,
    lessonDescription: lesson.description,
    vocabularyCount: lesson.vocabularyCount,
    questionCount: lesson.questionCount,
  }));
}

export async function fetchLessonDetail(lessonId: string): Promise<PublicLessonDetail> {
  const { lesson } = await apiRequest<{ lesson: ContentLessonDetail }>(
    endpoints.content.lesson(lessonId),
  );
  return {
    lessonId: lesson.id,
    lessonTitle: lesson.name,
    lessonDescription: lesson.description,
    lessonQuestions: lesson.questions.map(mapQuestion),
  };
}

export async function createLesson(input: LessonInput): Promise<PublicLessonSummary> {
  const { lesson } = await apiRequest<{ lesson: ContentLessonSummary }>(
    endpoints.content.lessons,
    { method: "POST", body: input },
  );
  return {
    lessonId: lesson.id,
    lessonTitle: lesson.name,
    lessonDescription: lesson.description,
    vocabularyCount: lesson.vocabularyCount ?? 0,
    questionCount: lesson.questionCount ?? 0,
  };
}

export async function updateLesson(
  lessonId: string,
  input: LessonInput,
): Promise<{ lessonId: string; lessonTitle: string; lessonDescription: string }> {
  const { lesson } = await apiRequest<{
    lesson: { id: string; name: string; description: string };
  }>(endpoints.content.lesson(lessonId), { method: "PATCH", body: input });
  return {
    lessonId: lesson.id,
    lessonTitle: lesson.name,
    lessonDescription: lesson.description,
  };
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await apiRequest(endpoints.content.lesson(lessonId), { method: "DELETE" });
}

export async function fetchLessonVocabularies(lessonId: string): Promise<ContentVocabulary[]> {
  const body = await apiRequest<{ vocabulary: ContentVocabulary[] }>(
    endpoints.content.vocabularies(lessonId),
  );
  return body.vocabulary;
}

export async function addLessonVocabularies(
  lessonId: string,
  items: Array<{ word: string; meaning: string }>,
): Promise<ContentVocabulary[]> {
  const body = await apiRequest<{ vocabulary: ContentVocabulary[] }>(
    endpoints.content.vocabularies(lessonId),
    { method: "POST", body: { items } },
  );
  return body.vocabulary;
}

export async function fetchManagedQuestions(lessonId: string): Promise<ManagedQuestion[]> {
  const body = await apiRequest<{ questions: Array<ManagedQuestion & { options: unknown }> }>(
    endpoints.content.managedQuestions(lessonId),
  );
  return body.questions.map(mapManagedQuestion);
}

export async function createQuestion(
  lessonId: string,
  input: QuestionInput,
): Promise<ManagedQuestion> {
  const { question } = await apiRequest<{ question: ManagedQuestion & { options: unknown } }>(
    endpoints.content.questions(lessonId),
    { method: "POST", body: input },
  );
  return mapManagedQuestion(question);
}

export async function updateQuestion(
  questionId: string,
  input: QuestionInput,
): Promise<ManagedQuestion> {
  const { question } = await apiRequest<{ question: ManagedQuestion & { options: unknown } }>(
    endpoints.content.question(questionId),
    { method: "PATCH", body: input },
  );
  return mapManagedQuestion(question);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiRequest(endpoints.content.question(questionId), { method: "DELETE" });
}

export type CheckAnswerResult = {
  correct: boolean;
  vocabularyId: string | null;
  masteryCandidateVocabularyId: string | null;
};

export async function checkLessonAnswer(
  questionId: string,
  selectedOptionIndex: number,
): Promise<CheckAnswerResult> {
  return apiRequest<CheckAnswerResult>(endpoints.content.checkQuestion(questionId), {
    method: "POST",
    body: { selectedOptionIndex },
  });
}
