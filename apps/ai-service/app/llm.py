import re
import asyncio
import logging
import time
from dataclasses import dataclass

from langchain_core.messages import BaseMessage

from .config import Settings

logger = logging.getLogger("uvicorn.error")

THINK_BLOCK_RE = re.compile(r"<think>[\s\S]*?</think>", re.IGNORECASE)
THINK_UNCLOSED_RE = re.compile(r"<think>[\s\S]*$", re.IGNORECASE)


@dataclass
class LLMResult:
    content: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


GEMINI_FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
]


def create_llm(settings: Settings):
    if not settings.llm_api_key:
        raise ValueError("LLM_API_KEY is required before sending a chat message")
    if settings.llm_provider in {"openai", "google", "gemini"}:
        from langchain_openai import ChatOpenAI
        from openai import APIConnectionError, APITimeoutError, InternalServerError

        base_url = settings.llm_base_url
        if settings.llm_provider in {"google", "gemini"} and not base_url:
            base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"

        is_gemini = settings.llm_provider in {"google", "gemini"} or (
            base_url and "generativelanguage.googleapis.com" in base_url
        )
        if is_gemini and base_url and not base_url.endswith("/"):
            base_url = f"{base_url}/"

        if is_gemini:
            models_to_try = [settings.llm_model] if settings.llm_model else []
            for m in GEMINI_FALLBACK_MODELS:
                if m not in models_to_try:
                    models_to_try.append(m)

            primary_llm = ChatOpenAI(
                model=models_to_try[0],
                api_key=settings.llm_api_key,
                base_url=base_url or None,
                temperature=settings.llm_temperature,
                disable_streaming=True,
                timeout=settings.llm_timeout_seconds,
                max_retries=0,
            )
            fallback_llms = [
                ChatOpenAI(
                    model=m,
                    api_key=settings.llm_api_key,
                    base_url=base_url or None,
                    temperature=settings.llm_temperature,
                    disable_streaming=True,
                    timeout=settings.llm_timeout_seconds,
                    max_retries=0,
                )
                for m in models_to_try[1:]
            ]
            return primary_llm.with_fallbacks(
                fallback_llms,
                # Quota/auth/request errors need user action, not more model attempts.
                exceptions_to_handle=(APIConnectionError, APITimeoutError, InternalServerError),
            )

        # Plain chat: do not bind tools.
        return ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=base_url or None,
            temperature=settings.llm_temperature,
            disable_streaming=True,
            timeout=settings.llm_timeout_seconds,
            max_retries=0,
        )
    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")


async def invoke_model(settings: Settings, model, messages: list[BaseMessage], task: str):
    """Bound the full call (including fallbacks) and log timing without user content."""
    started = time.perf_counter()
    try:
        response = await asyncio.wait_for(model.ainvoke(messages), timeout=settings.llm_total_timeout_seconds)
    except Exception as error:
        logger.warning("ai_call task=%s configured_model=%s elapsed_ms=%d status=error error=%s upstream_status=%s",
            task, settings.llm_model, round((time.perf_counter() - started) * 1000),
            type(error).__name__, getattr(error, "status_code", None))
        raise
    metadata = getattr(response, "response_metadata", {}) or {}
    actual = metadata.get("model_name") or metadata.get("model") or settings.llm_model
    logger.info("ai_call task=%s model=%s elapsed_ms=%d status=ok",
        task, actual, round((time.perf_counter() - started) * 1000))
    return response


def message_text(content: object) -> str:
    """Normalize LangChain / reasoning-model content blocks to plain text."""
    if content is None:
        return ""
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                block_type = block.get("type")
                if block_type in {"thinking", "reasoning"}:
                    continue
                if block_type == "text":
                    parts.append(str(block.get("text") or ""))
                elif "text" in block:
                    parts.append(str(block["text"]))
            else:
                block_type = getattr(block, "type", None)
                if block_type in {"thinking", "reasoning"}:
                    continue
                text_value = getattr(block, "text", None)
                if text_value:
                    parts.append(str(text_value))
        text = "\n".join(part for part in parts if part)
    else:
        text = str(content)

    text = THINK_BLOCK_RE.sub("", text)
    text = THINK_UNCLOSED_RE.sub("", text)
    return text.strip()


async def invoke_llm(settings: Settings, messages: list[BaseMessage]) -> LLMResult:
    llm = create_llm(settings)
    try:
        response = await invoke_model(settings, llm, messages, "chat")
    except Exception as error:
        text = str(error)
        if "tool_use_failed" in text or "Tool choice is none" in text:
            raise RuntimeError(
                "Model Groq từ chối vì cố gọi tool (tool_use_failed). "
                "Với chatbot học tiếng Hàn hãy dùng model chat thuần, ví dụ "
                "qwen/qwen3.6-27b — không dùng openai/gpt-oss-20b cho plain chat."
            ) from error
        raise

    usage = getattr(response, "usage_metadata", None) or {}
    meta = getattr(response, "response_metadata", {}) or {}
    actual_model = meta.get("model_name") or meta.get("model") or settings.llm_model
    return LLMResult(
        content=message_text(response.content),
        provider=settings.llm_provider,
        model=actual_model,
        input_tokens=usage.get("input_tokens"),
        output_tokens=usage.get("output_tokens"),
    )


FLASHCARD_SYSTEM_PROMPT = """
You are a Korean vocabulary generator for Vietnamese learners.

The user will ask you to generate vocabulary words. You MUST return ONLY a valid JSON object, with no extra text, no markdown fences, no backticks:

{
  "flashcards": [
    { "question": "<Korean word in Hangul>", "answer": "<Vietnamese meaning>" }
  ]
}

Rules:
- Always use Hangul for the question.
- Always use Vietnamese for the answer.
- Only include common, accurate words.
- Return exactly the number of items requested by the user.
""".strip()


async def generate_flashcards(settings: "Settings", user_prompt: str) -> list[dict]:
    """Call the LLM and return a list of {question, answer} dicts."""
    import json
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = create_llm(settings)
    response = await invoke_model(settings, llm, [
        SystemMessage(content=FLASHCARD_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ], "flashcards_generate")

    raw = message_text(response.content).strip()

    # Extract JSON if wrapped in markdown code blocks or surrounding text
    match = re.search(r"```(?:json)?\s*([\[{].*?[\]}])\s*```", raw, re.DOTALL)
    if match:
        raw = match.group(1).strip()
    else:
        first_brace = raw.find("{")
        first_bracket = raw.find("[")
        candidates = [idx for idx in [first_brace, first_bracket] if idx != -1]
        if candidates:
            start = min(candidates)
            if raw[start] == "{":
                end = raw.rfind("}")
            else:
                end = raw.rfind("]")
            if end != -1 and end > start:
                raw = raw[start : end + 1]

    data = json.loads(raw)
    items = []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("flashcards") or data.get("items") or data.get("words") or []

    result = []
    for item in items:
        if isinstance(item, dict):
            question = item.get("question") or item.get("korean") or item.get("word") or item.get("front") or ""
            answer = item.get("answer") or item.get("vietnamese") or item.get("meaning") or item.get("back") or ""
            if question and answer:
                result.append({"question": str(question), "answer": str(answer)})
    return result


REVIEW_QUESTIONS_SYSTEM_PROMPT = """
You are an expert Korean language teacher creating review questions for Vietnamese learners.

The user will provide:
- A list of Korean words to review (with optional Vietnamese meanings).
- A description / style of questions (e.g. "Revision word", "applied word question", "fill-in-the-blank", "conversational context").
- The requested number of review questions.

Generate multiple-choice review questions to test and reinforce the learner's knowledge of these words:
- For "Revision word": test the meaning or recognition of the target word. For example, ask for the Vietnamese meaning of the Korean word with 4 Vietnamese options (or give a Vietnamese meaning and ask which Korean word matches).
- For "applied word question": create realistic Korean sentences with a blank `___` or situational context where the target word fits naturally, with 4 plausible choices.
- Distribute questions evenly across the provided words.
- Each question must have EXACTLY 4 plausible options.
- Exactly one option is correct; `correct_option_index` must be an integer from 0 to 3 matching that correct option in the `options` array.
- Vary and shuffle the position of the correct option across 0, 1, 2, and 3 (do NOT always place the correct answer at index 0).
- Provide a concise explanation in Vietnamese explaining why the correct option is right and translating the sentence/word.

You MUST return ONLY a valid JSON object, with no extra text, no markdown fences, no backticks:

{
  "questions": [
    {
      "target_word": "<Korean word from list>",
      "prompt": "<Question prompt in Korean or Vietnamese>",
      "options": ["<Option 0>", "<Option 1>", "<Option 2>", "<Option 3>"],
      "correct_option_index": 1,
      "explanation": "<Explanation in Vietnamese>",
      "question_type": "revision"
    }
  ]
}
""".strip()


async def generate_review_questions(
    settings: Settings,
    words: list[object],
    description: str = "Revision and applied word questions",
    question_count: int = 5,
) -> list[dict]:
    """Call the LLM to generate multiple-choice review questions for the given words."""
    import json
    from langchain_core.messages import HumanMessage, SystemMessage

    # Normalize input words into strings and a vocabulary_id lookup map
    word_strings: list[str] = []
    vocab_map: dict[str, str] = {}
    for item in words:
        if isinstance(item, str):
            w = item.strip()
            if w:
                word_strings.append(w)
        elif isinstance(item, dict):
            w = str(item.get("word") or "").strip()
            meaning = item.get("meaning")
            v_id = item.get("vocabulary_id")
            if w:
                word_strings.append(f"{w} ({meaning})" if meaning else w)
                if v_id:
                    vocab_map[w] = str(v_id)
        elif hasattr(item, "word"):
            w = str(getattr(item, "word") or "").strip()
            meaning = getattr(item, "meaning", None)
            v_id = getattr(item, "vocabulary_id", None)
            if w:
                word_strings.append(f"{w} ({meaning})" if meaning else w)
                if v_id:
                    vocab_map[w] = str(v_id)

    if not word_strings:
        raise ValueError("At least one word must be provided to generate review questions")

    user_content = (
        f"Target words to review: {', '.join(word_strings)}\n"
        f"Question style/description: {description}\n"
        f"Number of questions to generate: {question_count}\n"
    )

    llm = create_llm(settings)
    response = await invoke_model(settings, llm, [
        SystemMessage(content=REVIEW_QUESTIONS_SYSTEM_PROMPT),
        HumanMessage(content=user_content),
    ], "questions_generate")

    raw = message_text(response.content).strip()

    # Extract JSON if wrapped in markdown code blocks or surrounding text
    match = re.search(r"```(?:json)?\s*([\[{].*?[\]}])\s*```", raw, re.DOTALL)
    if match:
        raw = match.group(1).strip()
    else:
        first_brace = raw.find("{")
        first_bracket = raw.find("[")
        candidates = [idx for idx in [first_brace, first_bracket] if idx != -1]
        if candidates:
            start = min(candidates)
            if raw[start] == "{":
                end = raw.rfind("}")
            else:
                end = raw.rfind("]")
            if end != -1 and end > start:
                raw = raw[start : end + 1]

    data = json.loads(raw)
    items = []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("questions") or data.get("items") or []

    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        prompt = str(item.get("prompt") or "").strip()
        options = item.get("options") or []
        if not prompt or not isinstance(options, list) or len(options) < 2:
            continue

        cleaned_options = [str(opt).strip() for opt in options]

        correct_idx = item.get("correct_option_index")
        if correct_idx is None:
            correct_idx = item.get("correctOptionIndex", 0)
        try:
            correct_idx = int(correct_idx)
        except (ValueError, TypeError):
            correct_idx = 0
        if correct_idx < 0 or correct_idx >= len(cleaned_options):
            correct_idx = 0

        target_word = str(item.get("target_word") or "").strip()
        v_id = vocab_map.get(target_word) or item.get("vocabulary_id")

        result.append({
            "target_word": target_word,
            "prompt": prompt,
            "options": cleaned_options,
            "correct_option_index": correct_idx,
            "correctOptionIndex": correct_idx,
            "explanation": str(item.get("explanation") or "").strip() or None,
            "question_type": str(item.get("question_type") or "").strip() or None,
            "vocabulary_id": str(v_id) if v_id else None,
        })

    return result
