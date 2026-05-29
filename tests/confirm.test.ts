import { describe, expect, it } from "vitest";

import { isConfirmationAccepted } from "../src/cli/confirm.js";

describe("isConfirmationAccepted", () => {
  it("accepts yes answers", () => {
    expect(isConfirmationAccepted("y")).toBe(true);
    expect(isConfirmationAccepted("YES")).toBe(true);
    expect(isConfirmationAccepted(" yes ")).toBe(true);
  });

  it("rejects empty and non-yes answers", () => {
    expect(isConfirmationAccepted("")).toBe(false);
    expect(isConfirmationAccepted("n")).toBe(false);
    expect(isConfirmationAccepted("no")).toBe(false);
  });
});
