// This client forwards lesson requests from the API Gateway to Content Service.
import { apiGatewayConfig } from "../config/index.js";
import { fetchService } from "./service-request-tracer.js";

export class ContentServiceRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ContentServiceRequestError";
  }
}

async function requestContentService(path: string, parentId?: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    apiGatewayConfig.contentServiceTimeoutMs,
  );

  try {
    const response = await fetchService(
      "Content",
      `${apiGatewayConfig.contentServiceUrl}${path}`,
      parentId,
      { signal: controller.signal },
    );

    if (!response.ok) {
      let message = "Content Service request failed.";

      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) {
          message = body.error;
        }
      } catch {
        // Keep the default message when the body is not JSON.
      }

      throw new ContentServiceRequestError(message, response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ContentServiceRequestError) {
      throw error;
    }

    throw new ContentServiceRequestError("Content Service is unavailable.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchLessonsFromContentService(parentId?: string): Promise<unknown> {
  return requestContentService("/lessons", parentId);
}

export function fetchLessonByIdFromContentService(lessonId: string, parentId?: string): Promise<unknown> {
  return requestContentService(`/lessons/${encodeURIComponent(lessonId)}`, parentId);
}
