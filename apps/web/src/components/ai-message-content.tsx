import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

marked.setOptions({ gfm: true, breaks: true });

export function AiMessageContent({ text }: { text: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(text, { async: false });
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [text]);

  return <div className="ai-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
