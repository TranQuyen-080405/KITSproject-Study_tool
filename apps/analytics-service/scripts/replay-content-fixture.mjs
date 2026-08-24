import { readFile } from "node:fs/promises";

const endpoint = process.env.ANALYTICS_URL ?? "http://localhost:3003";
const fixtureUrl = new URL("../fixtures/content-service-results.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

for (const [index, event] of fixture.events.entries()) {
  const response = await fetch(`${endpoint}/api/v1/analytics/reviews`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Event ${index + 1} failed: ${body.error ?? response.statusText}`);
  console.log(`${index + 1}. ${body.review.word}: ${body.review.status}; next review ${body.review.nextReviewAt}`);
}

console.log(`\nDashboard: ${endpoint}/api/v1/analytics/dashboard?userId=content-service-fixture-user`);
