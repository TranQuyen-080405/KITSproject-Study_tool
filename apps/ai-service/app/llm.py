import re
from dataclasses import dataclass

from langchain_core.messages import BaseMessage

from .config import Settings

THINK_BLOCK_RE = re.compile(r"<think>[\s\S]*?</think>", re.IGNORECASE)
THINK_UNCLOSED_RE = re.compile(r"<think>[\s\S]*$", re.IGNORECASE)


@dataclass
class LLMResult:
    content: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


def create_llm(settings: Settings):
    if not settings.llm_api_key:
        raise ValueError("LLM_API_KEY is required before sending a chat message")
    if settings.llm_provider == "openai":
        from langchain_openai import ChatOpenAI

        # Plain chat: do not bind tools. gpt-oss on Groq often emits tool calls
        # even when tool_choice is none → 400 tool_use_failed.
        return ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url or None,
            temperature=settings.llm_temperature,
            disable_streaming=True,
        )
    if settings.llm_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            temperature=settings.llm_temperature,
        )
    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")


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
        response = await llm.ainvoke(messages)
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
    return LLMResult(
        content=message_text(response.content),
        provider=settings.llm_provider,
        model=settings.llm_model,
        input_tokens=usage.get("input_tokens"),
        output_tokens=usage.get("output_tokens"),
    )
