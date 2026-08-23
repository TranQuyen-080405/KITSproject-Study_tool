from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from .config import Settings
from .models import Message


SYSTEM_PROMPT = """You are a supportive Korean language learning assistant.

Help learners improve Korean vocabulary, grammar, pronunciation, reading, writing, and everyday conversation. Adapt explanations and difficulty to the learner's apparent level. Reply in the learner's preferred language when possible, while keeping Korean examples in Hangul.

When correcting Korean, be encouraging and use this structure when useful:
1. Corrected sentence
2. Brief explanation of the correction
3. A natural alternative or one short practice example

Use clear, natural Korean. Explain grammar with concise examples, including translations when helpful. Do not invent facts about Korean language usage; say when something depends on context, register, or regional usage. Keep answers focused, practical, and suitable for study."""


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def build_context(settings: Settings, history: list[Message], current_message: str):
    selected: list[Message] = []
    token_budget = settings.max_context_tokens - estimate_tokens(SYSTEM_PROMPT) - estimate_tokens(current_message)
    used = 0
    for message in reversed(history):
        cost = estimate_tokens(message.content)
        if len(selected) >= settings.max_context_messages or used + cost > token_budget:
            break
        selected.append(message)
        used += cost
    selected.reverse()

    result = [SystemMessage(content=SYSTEM_PROMPT)]
    for message in selected:
        result.append(HumanMessage(content=message.content) if message.role == "user" else AIMessage(content=message.content))
    result.append(HumanMessage(content=current_message))
    return result
