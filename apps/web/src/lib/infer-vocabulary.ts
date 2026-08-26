export type VocabularyLink = { id: string; word: string; meaning: string };

export function inferVocabularyId(
  prompt: string,
  options: string[],
  correctOptionIndex: number,
  vocabulary: VocabularyLink[],
): string | null {
  if (vocabulary.length === 0) return null;

  const correctText = options[correctOptionIndex]?.trim().toLowerCase() ?? "";
  const byMeaning = vocabulary.find((item) => item.meaning.trim().toLowerCase() === correctText);
  if (byMeaning) return byMeaning.id;

  const byWord = vocabulary.find((item) => item.word.trim().toLowerCase() === correctText);
  if (byWord) return byWord.id;

  const inPrompt = vocabulary.find((item) => prompt.includes(item.word));
  if (inPrompt) return inPrompt.id;

  for (const option of options) {
    const text = option.trim().toLowerCase();
    const match = vocabulary.find(
      (item) =>
        item.meaning.trim().toLowerCase() === text || item.word.trim().toLowerCase() === text,
    );
    if (match) return match.id;
  }

  return vocabulary.length === 1 ? vocabulary[0].id : null;
}

export function inferVocabularyFromQuestion(
  prompt: string,
  options: string[],
  vocabulary: VocabularyLink[],
): string | null {
  for (let index = 0; index < options.length; index += 1) {
    const linked = inferVocabularyId(prompt, options, index, vocabulary);
    if (linked) return linked;
  }
  return vocabulary.length === 1 ? vocabulary[0].id : null;
}
