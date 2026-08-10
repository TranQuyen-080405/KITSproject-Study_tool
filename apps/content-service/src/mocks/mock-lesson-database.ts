// This file contains temporary lesson content owned by the Content Service.
export type MockLessonAnswerRecord = {
  answerId: string;
  answerText: string;
};

export type MockLessonQuestionRecord = {
  questionId: string;
  questionText: string;
  answerOptions: [
    MockLessonAnswerRecord,
    MockLessonAnswerRecord,
    MockLessonAnswerRecord,
    MockLessonAnswerRecord,
  ];
  correctAnswerId: string;
};

export type MockLessonRecord = {
  lessonId: string;
  lessonTitle: string;
  lessonQuestions: MockLessonQuestionRecord[];
};

export type MockLessonDatabase = {
  lessonRecords: MockLessonRecord[];
};

export const mockLessonDatabase: MockLessonDatabase = {
  lessonRecords: [
    {
      lessonId: "lesson-1",
      lessonTitle: "Bài học 1: Trường học",
      lessonQuestions: [
        {
          questionId: "lesson-1-question-1",
          questionText: "“Trường học” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-1-question-1-answer-a", answerText: "학교" },
            { answerId: "lesson-1-question-1-answer-b", answerText: "학생" },
            { answerId: "lesson-1-question-1-answer-c", answerText: "선생님" },
            { answerId: "lesson-1-question-1-answer-d", answerText: "친구" },
          ],
          correctAnswerId: "lesson-1-question-1-answer-a",
        },
        {
          questionId: "lesson-1-question-2",
          questionText: "“Học sinh” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-1-question-2-answer-a", answerText: "학교" },
            { answerId: "lesson-1-question-2-answer-b", answerText: "학생" },
            { answerId: "lesson-1-question-2-answer-c", answerText: "책" },
            { answerId: "lesson-1-question-2-answer-d", answerText: "의자" },
          ],
          correctAnswerId: "lesson-1-question-2-answer-b",
        },
        {
          questionId: "lesson-1-question-3",
          questionText: "“Giáo viên” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-1-question-3-answer-a", answerText: "친구" },
            { answerId: "lesson-1-question-3-answer-b", answerText: "교실" },
            { answerId: "lesson-1-question-3-answer-c", answerText: "선생님" },
            { answerId: "lesson-1-question-3-answer-d", answerText: "가방" },
          ],
          correctAnswerId: "lesson-1-question-3-answer-c",
        },
      ],
    },
    {
      lessonId: "lesson-2",
      lessonTitle: "Bài học 2: Gia đình",
      lessonQuestions: [
        {
          questionId: "lesson-2-question-1",
          questionText: "“Mẹ” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-2-question-1-answer-a", answerText: "아버지" },
            { answerId: "lesson-2-question-1-answer-b", answerText: "어머니" },
            { answerId: "lesson-2-question-1-answer-c", answerText: "동생" },
            { answerId: "lesson-2-question-1-answer-d", answerText: "할머니" },
          ],
          correctAnswerId: "lesson-2-question-1-answer-b",
        },
        {
          questionId: "lesson-2-question-2",
          questionText: "“Bố” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-2-question-2-answer-a", answerText: "아버지" },
            { answerId: "lesson-2-question-2-answer-b", answerText: "언니" },
            { answerId: "lesson-2-question-2-answer-c", answerText: "누나" },
            { answerId: "lesson-2-question-2-answer-d", answerText: "어머니" },
          ],
          correctAnswerId: "lesson-2-question-2-answer-a",
        },
        {
          questionId: "lesson-2-question-3",
          questionText: "“Em trai hoặc em gái” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-2-question-3-answer-a", answerText: "형" },
            { answerId: "lesson-2-question-3-answer-b", answerText: "오빠" },
            { answerId: "lesson-2-question-3-answer-c", answerText: "동생" },
            { answerId: "lesson-2-question-3-answer-d", answerText: "친구" },
          ],
          correctAnswerId: "lesson-2-question-3-answer-c",
        },
      ],
    },
    {
      lessonId: "lesson-3",
      lessonTitle: "Bài học 3: Chào hỏi",
      lessonQuestions: [
        {
          questionId: "lesson-3-question-1",
          questionText: "Cách nói “Xin chào” thông dụng là gì?",
          answerOptions: [
            { answerId: "lesson-3-question-1-answer-a", answerText: "안녕하세요" },
            { answerId: "lesson-3-question-1-answer-b", answerText: "감사합니다" },
            { answerId: "lesson-3-question-1-answer-c", answerText: "미안합니다" },
            { answerId: "lesson-3-question-1-answer-d", answerText: "안녕히 가세요" },
          ],
          correctAnswerId: "lesson-3-question-1-answer-a",
        },
        {
          questionId: "lesson-3-question-2",
          questionText: "“Cảm ơn” trong tiếng Hàn là gì?",
          answerOptions: [
            { answerId: "lesson-3-question-2-answer-a", answerText: "안녕하세요" },
            { answerId: "lesson-3-question-2-answer-b", answerText: "감사합니다" },
            { answerId: "lesson-3-question-2-answer-c", answerText: "괜찮아요" },
            { answerId: "lesson-3-question-2-answer-d", answerText: "네" },
          ],
          correctAnswerId: "lesson-3-question-2-answer-b",
        },
        {
          questionId: "lesson-3-question-3",
          questionText: "“Tạm biệt” nói với người đang rời đi là gì?",
          answerOptions: [
            { answerId: "lesson-3-question-3-answer-a", answerText: "안녕히 계세요" },
            { answerId: "lesson-3-question-3-answer-b", answerText: "안녕히 가세요" },
            { answerId: "lesson-3-question-3-answer-c", answerText: "감사합니다" },
            { answerId: "lesson-3-question-3-answer-d", answerText: "죄송합니다" },
          ],
          correctAnswerId: "lesson-3-question-3-answer-b",
        },
      ],
    },
  ],
};
