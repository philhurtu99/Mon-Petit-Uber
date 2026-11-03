import { getActiveRestrictedWordValues } from "./restrictedWord.service";
import { prisma } from "../lib/prisma";

const accentGroups: Record<string, string> = {
  a: "aàâäáãå",
  c: "cç",
  e: "eéèêë",
  i: "iîïíì",
  n: "nñ",
  o: "oôöóòõ",
  u: "uùûüú",
  y: "yÿ",
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createAccentInsensitivePattern = (word: string) =>
  Array.from(word.trim()).map((char) => {
    if (/\s/.test(char)) return "\\s+";

    const lowerChar = char.toLowerCase();
    const group = accentGroups[lowerChar];
    if (group) return `[${group}${group.toUpperCase()}]`;

    return escapeRegExp(char);
  }).join("");

const maskText = (value: string) => value.replace(/\S/g, "♥");

export const censorComment = (comment: string | null, restrictedWords: string[]) => {
  if (!comment) return comment;

  return restrictedWords
    .filter((word) => word.trim().length > 0)
    .sort((a, b) => b.length - a.length)
    .reduce((currentComment, word) => {
      const pattern = createAccentInsensitivePattern(word);
      const regex = new RegExp(`(^|[^\\p{L}\\p{N}])(${pattern})(?=$|[^\\p{L}\\p{N}])`, "giu");

      return currentComment.replace(regex, (_match, prefix: string, blockedWord: string) => {
        return `${prefix}${maskText(blockedWord)}`;
      });
    }, comment);
};

export const getUserProfanityFilterEnabled = async (userId?: string) => {
  if (!userId) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profanityFilterEnabled: true } as any,
  });

  return (user as any)?.profanityFilterEnabled ?? true;
};

export const filterReviewCommentsForUser = async <T extends { comment: string | null }>(
  reviews: T[],
  userId?: string,
) => {
  const filterEnabled = await getUserProfanityFilterEnabled(userId);
  if (!filterEnabled) return reviews;

  const restrictedWords = await getActiveRestrictedWordValues();
  if (restrictedWords.length === 0) return reviews;

  return reviews.map((review) => ({
    ...review,
    comment: censorComment(review.comment, restrictedWords),
  }));
};
