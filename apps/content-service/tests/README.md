# Content Service test strategy

## Test Pyramid

### 1. Unit + Contract

```bash
corepack pnpm --filter @korean-learning/content-service test:unit
```

- `services.test.ts`: validation, DTO serialization, 4 MCQ options, nullable
  `vocabularyId`, cross-lesson rule, grading/mastery candidate.
- `app.test.ts`: HTTP health and validation responses with Supertest.
- `contract.test.ts`: compares public DTOs with committed golden files.

No database or network is required.

### 2. PostgreSQL Integration

Requires the Compose PostgreSQL container on port `5434`:

```bash
docker compose up -d content-postgres
corepack pnpm --filter @korean-learning/content-service test:integration
```

The runner migrates and uses the isolated `content_test` PostgreSQL schema. It
tests repository/service behavior, foreign keys, `ON DELETE CASCADE`,
`ON DELETE SET NULL`, and transaction rollback. It never clears the normal
`public` schema.

Override when needed:

```bash
CONTENT_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5434/content_service?schema=my_test_schema
```

### 3. End-to-End REST

```bash
docker compose up -d --build content-service
corepack pnpm --filter @korean-learning/content-service test:e2e
```

Set `CONTENT_API_URL=http://localhost:3000/api/v1/content` to run through the
Gateway. The workflow creates real records through REST and checks status codes,
relations, negative cases, and public payloads.

### 4. Contract / Golden Files

`fixtures/expected_outputs/successful_flow.json` is versioned. Changes to public
response fields must intentionally update both the serializer and golden file.

## Test case matrix

- **TC-01:** create valid Lesson → `201` and `lesson.id`.
- **TC-02:** add one or more Vocabulary rows → `201`, correct `lessonId`.
- **TC-03:** create Question whose `vocabularyId` belongs to the Lesson → `201`.
- **TC-04:** create general Question with `vocabularyId: null` → `201`; a correct
  answer has no mastery candidate.
- **TC-05:** target Vocabulary belongs to another Lesson → `400`.
- **TC-06:** target Vocabulary does not exist → `404`.
- **TC-07:** deleting Lesson cascades Vocabulary/Question; deleting Vocabulary
  sets `Question.vocabularyId` to `NULL`; failed transactions roll back.

## Data-driven I/O tracking

```text
tests/
  fixtures/
    inputs/
      create_lesson.json
      create_vocabulary.json
      create_question.json
    expected_outputs/
      successful_flow.json
  logs/
    run_reports/
      report_<timestamp>.json
      report_latest.json
  scripts/
    run-api-tests.mjs
    run-integration-tests.mjs
```

The E2E request wrapper records:

- timestamp, endpoint, method;
- request headers and payload;
- response status, headers, and body;
- execution time in milliseconds.

Reports are local/CI artifacts and therefore gitignored. Fixtures and golden
outputs are committed for reviewable diffs.
