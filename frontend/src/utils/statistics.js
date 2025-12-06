/**
 * Utility functions for calculating text statistics
 */

/**
 * Approximate token count using a simple heuristic
 * Roughly 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text) {
  if (!text) return 0;
  // Simple approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Count emojis in text
 * Uses Unicode emoji ranges and common emoji patterns
 */
export function countEmojis(text) {
  if (!text) return 0;
  
  // Unicode emoji ranges
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;
  
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
}

/**
 * Count words in text
 */
export function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count sentences in text
 */
export function countSentences(text) {
  if (!text) return 0;
  return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
}

/**
 * Calculate average word length
 */
export function averageWordLength(text) {
  const words = countWords(text);
  if (words === 0) return 0;
  const totalChars = text.replace(/\s+/g, '').length;
  return (totalChars / words).toFixed(1);
}

/**
 * Estimate reading time in minutes
 * Average reading speed: 200 words per minute
 */
export function estimateReadingTime(text) {
  const words = countWords(text);
  return (words / 200).toFixed(1);
}

/**
 * Calculate characters per second (throughput)
 */
export function calculateThroughput(text, totalTimeSeconds) {
  if (!text || !totalTimeSeconds || totalTimeSeconds === 0) return 0;
  return (text.length / totalTimeSeconds).toFixed(0);
}

/**
 * Calculate tokens per second
 */
export function calculateTokensPerSecond(text, totalTimeSeconds) {
  if (!text || !totalTimeSeconds || totalTimeSeconds === 0) return 0;
  const tokens = estimateTokenCount(text);
  return (tokens / totalTimeSeconds).toFixed(1);
}

/**
 * Calculate all statistics for a given response
 */
export function calculateAllStatistics(response, totalTimeSeconds) {
  return {
    tokenCount: estimateTokenCount(response),
    emojiCount: countEmojis(response),
    wordCount: countWords(response),
    sentenceCount: countSentences(response),
    averageWordLength: parseFloat(averageWordLength(response)),
    readingTime: parseFloat(estimateReadingTime(response)),
    throughput: parseFloat(calculateThroughput(response, totalTimeSeconds)),
    tokensPerSecond: parseFloat(calculateTokensPerSecond(response, totalTimeSeconds)),
  };
}







