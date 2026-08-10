// This service maps owned lesson records into public Content API responses.
import {
  findLessonRecordById,
  listLessonRecords,
} from "../repositories/lesson-repository.js";

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
  questionCount: number;
};

export type PublicLessonDetail = {
  lessonId: string;
  lessonTitle: string;
  lessonQuestions: PublicLessonQuestion[];
};

export type SubmittedLessonAnswer = {
  questionId: string;
  selectedAnswerId: string;
};

export type AnswerCheckResult = {
  questionId: string;
  wordId: string;
  wordText: string;
  isCorrect: boolean;
};

export function listPublicLessons(): PublicLessonSummary[] {
  return listLessonRecords().map((lesson) => ({
    lessonId: lesson.lessonId,
    lessonTitle: lesson.lessonTitle,
    questionCount: lesson.lessonQuestions.length,
  }));
}

export function getPublicLessonById(lessonId: string): PublicLessonDetail | undefined {
  const lesson = findLessonRecordById(lessonId);

  if (!lesson) {
    return undefined;
  }

  return {
    lessonId: lesson.lessonId,
    lessonTitle: lesson.lessonTitle,
    lessonQuestions: lesson.lessonQuestions.map((question) => ({
      questionId: question.questionId,
      questionText: question.questionText,
      answerOptions: question.answerOptions.map((answer) => ({
        answerId: answer.answerId,
        answerText: answer.answerText,
      })),
    })),
  };
}

export function checkSubmittedLessonAnswers(
  lessonId: string,
  submittedAnswers: SubmittedLessonAnswer[],
): AnswerCheckResult[] | undefined {
  const lesson = findLessonRecordById(lessonId);
  if (!lesson) return undefined;

  const selectedAnswers = new Map(
    submittedAnswers.map((answer) => [answer.questionId, answer.selectedAnswerId]),
  );

  return lesson.lessonQuestions.map((question) => {
    const correctAnswer = question.answerOptions.find(
      (answer) => answer.answerId === question.correctAnswerId,
    );
    return {
      questionId: question.questionId,
      wordId: question.correctAnswerId,
      wordText: correctAnswer?.answerText ?? "",
      isCorrect: selectedAnswers.get(question.questionId) === question.correctAnswerId,
    };
  });
}
