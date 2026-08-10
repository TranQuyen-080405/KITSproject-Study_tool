// This file stores temporary study attempts owned by the Learning Service.
export type StudyAttemptRecord = {
  attemptId: string;
  userId: string;
  lessonId: string;
  correctCount: number;
  totalCount: number;
};

const studyAttemptRecords: StudyAttemptRecord[] = [];

export function saveStudyAttempt(record: StudyAttemptRecord): void {
  studyAttemptRecords.push(record);
}
