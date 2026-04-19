import { describe, expect, it } from "vitest";

import { buildPollingCronExpression } from "./x-client";

describe("buildPollingCronExpression", () => {
  it("rounds sub-minute intervals up to one minute", () => {
    expect(buildPollingCronExpression(30)).toBe("*/1 * * * *");
  });

  it("converts five minutes cleanly", () => {
    expect(buildPollingCronExpression(300)).toBe("*/5 * * * *");
  });

  it("converts long intervals to hourly schedules", () => {
    expect(buildPollingCronExpression(7200)).toBe("0 */2 * * *");
  });
});
