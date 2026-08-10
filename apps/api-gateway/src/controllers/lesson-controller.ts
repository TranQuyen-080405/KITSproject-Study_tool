// This controller proxies lesson requests through the API Gateway.
import type { Response } from "express";
import type { TracedRequest } from "../middleware/trace-api-call.js";
import {
  ContentServiceRequestError,
  fetchLessonByIdFromContentService,
  fetchLessonsFromContentService,
} from "../services/content-service-client.js";

export async function getLessons(request: TracedRequest, response: Response): Promise<void> {
  try {
    const lessons = await fetchLessonsFromContentService(request.apiCallTraceId);
    response.json(lessons);
  } catch (error) {
    if (error instanceof ContentServiceRequestError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    response.status(500).json({ error: "Unexpected gateway error." });
  }
}

export async function getLessonById(request: TracedRequest, response: Response): Promise<void> {
  try {
    const lessonId = String(request.params.lessonId ?? "");
    const lesson = await fetchLessonByIdFromContentService(lessonId, request.apiCallTraceId);
    response.json(lesson);
  } catch (error) {
    if (error instanceof ContentServiceRequestError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    response.status(500).json({ error: "Unexpected gateway error." });
  }
}
