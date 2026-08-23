from dataclasses import dataclass

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage

from .config import Settings


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
        return ChatOpenAI(model=settings.llm_model, api_key=settings.llm_api_key, base_url=settings.llm_base_url or None, temperature=settings.llm_temperature)
    if settings.llm_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=settings.llm_model, api_key=settings.llm_api_key, temperature=settings.llm_temperature)
    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")


async def invoke_llm(settings: Settings, messages: list[BaseMessage]) -> LLMResult:
    llm = create_llm(settings)
    response = await llm.ainvoke(messages)
    usage = getattr(response, "usage_metadata", None) or {}
    return LLMResult(
        content=str(response.content),
        provider=settings.llm_provider,
        model=settings.llm_model,
        input_tokens=usage.get("input_tokens"),
        output_tokens=usage.get("output_tokens"),
    )
