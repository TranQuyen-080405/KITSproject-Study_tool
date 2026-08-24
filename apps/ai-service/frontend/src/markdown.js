import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Convert AI markdown text to safe HTML for the chat bubble.
 * User messages should stay plain text — only use this for assistant replies.
 */
export function formatAiMarkdown(text) {
  if (!text) return "";
  const raw = marked.parse(String(text), { async: false });
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  });
}
