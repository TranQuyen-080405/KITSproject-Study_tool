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

export async function checkLessonAnswer(
  questionId: string,
  selectedOptionIndex: number,
): Promise<{ correct: boolean; masteryCandidateVocabularyId: string | null }> {
  return apiRequest(endpoints.content.checkQuestion(questionId), {
    method: "POST",
    body: { selectedOptionIndex },
  });
}
