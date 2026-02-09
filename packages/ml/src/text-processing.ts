const STOPWORDS = new Set([
  // EN
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'i', 'you', 'he', 'she', 'we', 'they', 'video', 'vlog', 'how', 'why', 'what',
  // PL
  'w', 'z', 'i', 'o', 'na', 'do', 'dla', 'po', 'jak', 'co', 'czy', 'jest', 'są', 'był', 'będzie', 'to', 'tam', 'ten', 'ta', 'te', 'się', 'nie', 'ale', 'lub', 'albo', 'film', 'vlog'
]);

export const cleanText = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, '') // Remove non-letters
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
};

export const getTopWords = (texts: string[], topN = 3): string => {
  const counts = new Map<string, number>();
  texts.forEach(text => {
    cleanText(text).forEach(word => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(e => e[0])
    .join(', ');
};

export const calculateSimilarity = (text1: string, text2: string): number => {
  const tokens1 = new Set(cleanText(text1));
  const tokens2 = new Set(cleanText(text2));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
};
