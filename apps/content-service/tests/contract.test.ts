import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { serializePublicQuestion } from "../src/services/index.js";

const golden = JSON.parse(
  readFileSync(
    new URL("./fixtures/expected_outputs/successful_flow.json", import.meta.url),
    "utf8",
  ),
);

describe("Content API golden contracts", () => {
  it("keeps the public question payload stable", () => {
    const publicQuestion = serializePublicQuestion({
      ...golden.publicQuestion,
      correctOptionIndex: 0,
    });

    expect(publicQuestion).toEqual(golden.publicQuestion);
  });

  it("tracks every requested test case", () => {
    expect(Object.keys(golden.cases)).toEqual([
      "TC-01",
      "TC-02",
      "TC-03",
      "TC-04",
      "TC-05",
      "TC-06",
      "TC-07",
    ]);
  });
});
