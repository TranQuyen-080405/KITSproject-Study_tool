// This repository reads lesson content owned by the Content Service.
import {
  mockLessonDatabase,
  type MockLessonRecord,
} from "../mocks/mock-lesson-database.js";

export function listLessonRecords(): MockLessonRecord[] {
  return mockLessonDatabase.lessonRecords;
}

export function findLessonRecordById(lessonId: string): MockLessonRecord | undefined {
  return mockLessonDatabase.lessonRecords.find((lesson) => lesson.lessonId === lessonId);
}
