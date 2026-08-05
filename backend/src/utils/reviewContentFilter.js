const DEFAULT_BLOCKED_TERMS = [
  'địt', 'đụ', 'đụ má', 'đù má', 'đéo', 'đĩ', 'lồn', 'cặc', 'cứt',
  'óc chó', 'súc vật', 'chó chết',
  'dit', 'duma', 'dume', 'dmm', 'vcl',
  'fuck', 'shit', 'bitch', 'asshole',
];

// Giữ dấu tiếng Việt để tránh nhầm các từ hợp lệ như “lớn”, “các”, “đủ”.
const normalize = (value) => String(value || '')
  .normalize('NFC')
  .toLocaleLowerCase('vi-VN')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getBlockedTerms = () => {
  const custom = String(process.env.REVIEW_BLOCKED_WORDS || '')
    .split(',')
    .map(normalize)
    .filter(Boolean);
  return [...new Set([...DEFAULT_BLOCKED_TERMS.map(normalize), ...custom])];
};

const containsBlockedTerm = (comment) => {
  const text = ` ${normalize(comment)} `;
  if (!text.trim()) return null;
  return getBlockedTerms().find((term) => text.includes(` ${term} `)) || null;
};

const looksLikeSpam = (comment) => {
  const raw = String(comment || '').trim();
  if (!raw) return false;
  const urlCount = (raw.match(/https?:\/\/|www\./gi) || []).length;
  const repeatedChars = /(.)\1{9,}/u.test(raw);
  const repeatedPhrase = /(.{4,30})\s*\1\s*\1/iu.test(raw);
  return urlCount >= 3 || repeatedChars || repeatedPhrase;
};

const assertReviewContentAllowed = (comment) => {
  if (!comment) return;
  const blocked = containsBlockedTerm(comment);
  if (blocked || looksLikeSpam(comment)) {
    const error = new Error('Nội dung đánh giá có từ ngữ xúc phạm, tục tĩu hoặc dấu hiệu spam. Vui lòng chỉnh sửa trước khi gửi.');
    error.statusCode = 400;
    error.code = 'REVIEW_CONTENT_REJECTED';
    throw error;
  }
};

module.exports = {
  normalizeReviewText: normalize,
  containsBlockedTerm,
  looksLikeSpam,
  assertReviewContentAllowed,
};
