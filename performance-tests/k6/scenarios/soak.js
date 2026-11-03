import { assertTargetSafety, scenarioOptions } from "../lib/config.js";
import runReadOnlyJourney, { createTestContext } from "../lib/requests.js";
import { buildSummary } from "../lib/summary.js";

assertTargetSafety({ highLoad: true });

export const options = scenarioOptions("soak");
export const setup = createTestContext;
export default runReadOnlyJourney;
export const handleSummary = buildSummary;
