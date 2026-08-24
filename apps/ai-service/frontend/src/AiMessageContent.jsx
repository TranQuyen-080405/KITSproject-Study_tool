import { useMemo } from "react";
import { formatAiMarkdown } from "./markdown.js";

/** Renders assistant markdown with typography styles. */
export function AiMessageContent({ text }) {
  const html = useMemo(() => formatAiMarkdown(text), [text]);
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
