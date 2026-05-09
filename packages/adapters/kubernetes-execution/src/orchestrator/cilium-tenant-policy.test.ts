import { describe, it, expect } from "vitest";
import { buildTenantCiliumPolicy } from "./cilium-tenant-policy.js";

describe("buildTenantCiliumPolicy", () => {
  it("returns null when both arrays are empty (no extra CNP)", () => {
    const result = buildTenantCiliumPolicy({
      namespace: "paperclip-acme",
      companySlug: "acme",
      dnsAllowlist: [],
      egressCidrs: [],
    });
    expect(result).toBeNull();
  });
});
