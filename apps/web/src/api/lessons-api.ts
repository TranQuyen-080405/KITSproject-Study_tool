// This module calls lesson APIs through the API Gateway only.
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

async function requestGateway<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    let message = "Không tải được dữ liệu bài học.";

    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the default message when the body is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchLessonSummaries(): Promise<PublicLessonSummary[]> {
  const body = await requestGateway<{ lessons: PublicLessonSummary[] }>("/api/lessons");
  return body.lessons;
}

export async function fetchLessonDetail(lessonId: string): Promise<PublicLessonDetail> {
  return requestGateway<PublicLessonDetail>(`/api/lessons/${encodeURIComponent(lessonId)}`);
}
