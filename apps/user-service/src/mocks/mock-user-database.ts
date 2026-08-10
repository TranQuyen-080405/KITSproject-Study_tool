// Seed shape for the User Service mock database (runtime data lives in data/users.json).
export type MockUserRecord = {
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
};

export type MockUserDatabase = {
  userRecords: MockUserRecord[];
};
