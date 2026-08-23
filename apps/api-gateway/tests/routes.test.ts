import type { ServerResponse } from "node:http";
import { describe, expect, test, vi } from "vitest";
import { handleProxyError } from "../src/routes/index.js";

function createResponseDouble(headersSent: boolean) {
  const writeHead = vi.fn();
  const end = vi.fn();
  const response = {
    headersSent,
    writeHead,
    end,
  } as unknown as ServerResponse;

  return { end, response, writeHead };
}

describe("handleProxyError", () => {
  test("ends the response when headers have already been sent", () => {
    const { end, response, writeHead } = createResponseDouble(true);

    handleProxyError("Analytics", response);

    expect(writeHead).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
  });

  test("writes a 503 JSON response when headers have not been sent", () => {
    const { end, response, writeHead } = createResponseDouble(false);

    handleProxyError("Analytics", response);

    expect(writeHead).toHaveBeenCalledWith(503, { "Content-Type": "application/json" });
    expect(end).toHaveBeenCalledWith(JSON.stringify({ error: "Analytics service unavailable" }));
  });
});
