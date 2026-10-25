import { describe, expect, it } from "vitest";
import { shuffle, validateQuestion } from "../src/study";
describe("study preparation", () => {
  it("shuffles without dropping, duplicating, or mutating study items", () => {
    const items = [1, 2, 3, 4, 5]; const result = shuffle(items, () => 0);
    expect(items).toEqual([1, 2, 3, 4, 5]); expect(result).not.toEqual(items); expect([...result].sort()).toEqual(items);
    expect(shuffle([])).toEqual([]); expect(shuffle([1])).toEqual([1]);
  });
  it("rejects incomplete, duplicate, and unmarked answer choices", () => {
    expect(validateQuestion("", ["a", "b", "c", "d"], 0)).toBeTruthy();
    expect(validateQuestion("Q", ["a", "b", "c", ""], 0)).toBeTruthy();
    expect(validateQuestion("Q", ["a", " a ", "c", "d"], 0)).toBeTruthy();
    expect(validateQuestion("Q", ["a", "b", "c", "d"], -1)).toBeTruthy();
    expect(validateQuestion("Q", ["a", "b", "c", "d"], 3)).toBeUndefined();
  });
});
