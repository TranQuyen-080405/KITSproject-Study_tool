/** Quick chips when composer is empty. */
export const QUICK_PROMPTS = [
  "안녕하세요! 오늘 기분이 어때요?",
  "“먹다” nghĩa là gì?",
  "저는 한국어를 공부해요 đúng không?",
];

/** Bank for typeahead while typing. */
export const PROMPT_BANK = [
  ...QUICK_PROMPTS,
  "오늘 뭐 했어요?",
  "저는 오늘 학교에 갔어요.",
  "주말에 뭐 하고 싶어요?",
  "저는 한국 음식을 좋아해요. 특히 김치찌개를 좋아해요.",
  "공부하다 dùng như thế nào?",
  "안녕하세요 nghĩa là gì? Có dùng với bạn bè được không?",
  "“맛있다” và “맛있어요” khác nhau như thế nào?",
  "이 문장 고쳐 주세요: 나는 어제 영화 봐요.",
  "Từ 가다 chia hiện tại lịch sự thế nào?",
  "Giải thích trợ từ 은/는 và 이/가.",
  "Hãy sửa câu này và giải thích bằng tiếng Việt.",
  "Luyện hội thoại gọi món ăn ở nhà hàng.",
  "Dịch sang tiếng Hàn: Hôm nay tôi đi học.",
  "Phát âm ㄹ cuối âm khác nhau thế nào?",
  "Cho ví dụ câu với 고 싶어요.",
  "Gợi ý 5 từ vựng TOPIK I chủ đề mua sắm.",
  "Giải thích ngữ pháp -아/어서 và -(으)니까 khác nhau thế nào?",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match prompt bank entries while user types. */
export function matchPrompts(query: string, bank = PROMPT_BANK, limit = 5) {
  const q = normalize(query);
  if (q.length < 1) return [];

  const scored = bank
    .map((prompt) => {
      const n = normalize(prompt);
      if (!n || n === q) return null;

      let score = 0;
      if (n.includes(q)) score += 40;
      if (n.startsWith(q)) score += 25;
      if (q.includes(n.slice(0, Math.min(8, n.length)))) score += 10;

      const qTokens = q.split(" ").filter(Boolean);
      const hits = qTokens.filter((token) => token.length > 1 && n.includes(token)).length;
      score += hits * 8;

      const lengthGap = Math.abs(prompt.length - query.trim().length);
      score += Math.max(0, 18 - lengthGap);

      if (score <= 0) return null;
      return { prompt, score, lengthGap };
    })
    .filter((item): item is { prompt: string; score: number; lengthGap: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.lengthGap - b.lengthGap);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of scored) {
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    out.push(item.prompt);
    if (out.length >= limit) break;
  }
  return out;
}
