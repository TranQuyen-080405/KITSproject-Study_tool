import { describe, expect, it } from "vitest";
import { extractCardsFromTexts } from "../src/pages/chatbot-page";

describe("extractCardsFromTexts", () => {
  it("extracts words and meanings from standardized markdown bullet format", () => {
    const aiMessage = `
Dưới đây là 5 từ vựng TOPIK I:
- **사과** : Quả táo
- **바나나** : Quả chuối
- **학교** : Trường học
- **공부하다** : Học bài
- **물** : Nước
    `;
    const cards = extractCardsFromTexts([aiMessage]);
    expect(cards).toEqual([
      { front: "사과", back: "Quả táo" },
      { front: "바나나", back: "Quả chuối" },
      { front: "학교", back: "Trường học" },
      { front: "공부하다", back: "Học bài" },
      { front: "물", back: "Nước" },
    ]);
  });

  it("extracts words with numbered bullets and colons", () => {
    const aiMessage = `
1. **사과**: Quả táo
2. **바나나**: Quả chuối
    `;
    const cards = extractCardsFromTexts([aiMessage]);
    expect(cards).toEqual([
      { front: "사과", back: "Quả táo" },
      { front: "바나나", back: "Quả chuối" },
    ]);
  });

  it("ignores example sentences and keeps only word : meaning lines", () => {
    const aiMessage = `
- 사과 : Quả táo
  - Ví dụ: 사과가 맛있어요 (Táo rất ngon)
- 바나나 : Quả chuối
  - Ví dụ: 바나나를 먹어요 (Tôi ăn chuối)
- **사과** (Quả táo)
    `;
    const cards = extractCardsFromTexts([aiMessage]);
    expect(cards).toEqual([
      { front: "사과", back: "Quả táo" },
      { front: "바나나", back: "Quả chuối" },
    ]);
  });

  it("cleans trailing Korean examples from meaning", () => {
    const aiMessage = `
- **사과** : Quả táo (Ví dụ: 저는 사과를 먹어요)
    `;
    const cards = extractCardsFromTexts([aiMessage]);
    expect(cards).toEqual([
      { front: "사과", back: "Quả táo" },
    ]);
  });

  it("ignores markdown tables and bare Korean sentences", () => {
    const aiMessage = `
| **사과** | Quả táo |
사과가 맛있어요
    `;
    expect(extractCardsFromTexts([aiMessage])).toEqual([]);
  });
});
