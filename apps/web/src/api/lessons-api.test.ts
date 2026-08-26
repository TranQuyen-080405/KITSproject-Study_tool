import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkLessonAnswer,
  createLesson,
  deleteLesson,
  fetchLessonDetail,
  fetchLessonSummaries,
  updateLesson,
} from "./lessons-api";

afterEach(() => vi.unstubAllGlobals());

describe("Content API mapping", () => {
  it("maps Content lesson summaries to the existing Web model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            lessons: [
              {
                id: "lesson-1",
                name: "Chào hỏi",
                description: "Cơ bản",
                vocabularyCount: 2,
                questionCount: 1,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(fetchLessonSummaries()).resolves.toEqual([
      {
        lessonId: "lesson-1",
        lessonTitle: "Chào hỏi",
        lessonDescription: "Cơ bản",
        vocabularyCount: 2,
        questionCount: 1,
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/content/lessons",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("maps option indexes and grades through Content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            lesson: {
              id: "lesson-1",
              name: "Chào hỏi",
              description: "Cơ bản",
              questions: [
                {
                  id: "question-1",
                  prompt: "안녕하세요 là gì?",
                  options: ["xin chào", "cảm ơn", "tạm biệt", "xin lỗi"],
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ correct: true, vocabularyId: "vocabulary-1", masteryCandidateVocabularyId: "vocabulary-1" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const lesson = await fetchLessonDetail("lesson-1");
    expect(lesson.lessonQuestions[0].answerOptions[0]).toEqual({
      answerId: "0",
      answerText: "xin chào",
    });
    await expect(checkLessonAnswer("question-1", 0)).resolves.toEqual({
      correct: true,
      vocabularyId: "vocabulary-1",
      masteryCandidateVocabularyId: "vocabulary-1",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/content/questions/question-1/check",
      expect.objectContaining({ body: JSON.stringify({ selectedOptionIndex: 0 }) }),
    );
  });

  it("creates updates and deletes lessons through Content write APIs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            lesson: {
              id: "lesson-2",
              name: "Số đếm",
              description: "1-10",
              vocabularyCount: 0,
              questionCount: 0,
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            lesson: { id: "lesson-2", name: "Số đếm cơ bản", description: "1-20" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLesson({ name: "Số đếm", description: "1-10" }),
    ).resolves.toMatchObject({
      lessonId: "lesson-2",
      lessonTitle: "Số đếm",
    });
    await expect(
      updateLesson("lesson-2", { name: "Số đếm cơ bản", description: "1-20" }),
    ).resolves.toEqual({
      lessonId: "lesson-2",
      lessonTitle: "Số đếm cơ bản",
      lessonDescription: "1-20",
    });
    await expect(deleteLesson("lesson-2")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/v1/content/lessons", "POST"],
      ["/api/v1/content/lessons/lesson-2", "PATCH"],
      ["/api/v1/content/lessons/lesson-2", "DELETE"],
    ]);
  });
});
