// This file sends temporary learning events directly to Analytics Service.
import { learningServiceConfig } from "../config/index.js";

export type AnswerCheckedEvent = {
  eventId: string;
  userId: string;
  wordId: string;
  wordText: string;
  isCorrect: boolean;
};

export async function publishAnswerCheckedEvents(events: AnswerCheckedEvent[]): Promise<void> {
  // ponytail: synchronous HTTP is only for the MVP; replace with RabbitMQ when retry/durability is needed.
  for (const event of events) {
    const response = await fetch(
      `${learningServiceConfig.analyticsServiceUrl}/internal/events/answer-checked`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) },
    );
    if (!response.ok) throw new Error("Analytics Service could not record the answer.");
  }
}
