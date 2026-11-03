import { assertTargetSafety, scenarioOptions } from "../lib/config.js";
import { createTestContext, executeReads } from "../lib/requests.js";
import { buildSummary } from "../lib/summary.js";

assertTargetSafety({ highLoad: true });

export const options = scenarioOptions("capacity");
export const setup = createTestContext;
export default executeReads;
export const handleSummary = buildSummary;
