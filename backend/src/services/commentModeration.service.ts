import {
  getActiveRestrictedWordValues,
  upsertAiRestrictedWords,
} from "./restrictedWord.service";

const DETECTION_TEST_TOKEN = "__AI_FLAG_TEST__";

const normalize = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("fr-CA")
    .replace(/\s+/g, " ");

const findRestrictedWordsInComment = async (comment: string) => {
  const normalizedComment = normalize(comment);
  const activeWords = await getActiveRestrictedWordValues();

  return activeWords
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word, index, words) => words.indexOf(word) === index)
    .filter((word) => normalizedComment.includes(normalize(word)));
};

export const getCommentModerationDiagnostics = async (comment: string) => {
  const trimmedComment = comment.trim();

  if (!trimmedComment) {
    return {
      externalModerationEnabled: false,
      moderation: { flagged: false, categories: {} },
      flaggedWords: [],
    };
  }

  const flaggedWords = await findRestrictedWordsInComment(trimmedComment);

  return {
    externalModerationEnabled: false,
    moderation: {
      flagged: flaggedWords.length > 0,
      categories: flaggedWords.length > 0 ? { restricted_words: true } : {},
    },
    flaggedWords,
  };
};

export const validateReviewComment = async (comment?: string | null) => {
  const trimmedComment = comment?.trim();
  if (!trimmedComment) return;

  if (trimmedComment.includes(DETECTION_TEST_TOKEN)) {
    await upsertAiRestrictedWords([DETECTION_TEST_TOKEN]);
    return;
  }

  const flaggedWords = await findRestrictedWordsInComment(trimmedComment);

  if (flaggedWords.length > 0) {
    await upsertAiRestrictedWords(flaggedWords);
  }
};
