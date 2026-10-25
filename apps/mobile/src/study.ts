export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function validateQuestion(prompt: string, options: string[], correctOptionIndex: number): string | undefined {
  if (!prompt.trim()) return "Enter a question.";
  if (prompt.trim().length > 500) return "Keep the question under 500 characters.";
  if (options.length !== 4 || options.some((option) => !option.trim())) return "Fill in all four answer choices.";
  if (options.some((option) => option.trim().length > 300)) return "Keep each answer under 300 characters.";
  if (new Set(options.map((option) => option.trim())).size !== 4) return "Each answer choice must be different.";
  if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) return "Choose the correct answer.";
}
