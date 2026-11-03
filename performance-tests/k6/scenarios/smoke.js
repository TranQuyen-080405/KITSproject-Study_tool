import { assertTargetSafety, scenarioOptions } from "../lib/config.js";
import runReadOnlyJourney, { createTestContext } from "../lib/requests.js";
import { buildSummary } from "../lib/summary.js";

assertTargetSafety();

export const options = scenarioOptions("smoke");
export const setup = createTestContext;
export default runReadOnlyJourney;
export const handleSummary = buildSummary;
