import type { CiliumNetworkPolicyDoc } from "./cilium-network-policy.js";

export interface BuildTenantCiliumInput {
  namespace: string;
  companySlug: string;
  dnsAllowlist: string[];
  egressCidrs: string[];
}

/**
 * Build a per-tenant CiliumNetworkPolicy that intersects with M1's baseline.
 *
 * Cilium evaluates multiple CNPs as an AND: traffic is allowed only when
 * every selecting policy permits it. When this builder returns a CNP, the
 * effective egress for the tenant becomes
 *   M1 baseline ∩ (kube-dns, dnsAllowlist, egressCidrs)
 * — strictly tighter than M1 alone.
 *
 * Returns `null` when both arrays are empty, in which case
 * `ensureTenantNamespace` does not apply a second CNP and the M1 baseline
 * alone governs egress.
 */
export function buildTenantCiliumPolicy(input: BuildTenantCiliumInput): CiliumNetworkPolicyDoc | null {
  if (input.dnsAllowlist.length === 0 && input.egressCidrs.length === 0) return null;
  // Implementation continues in Task 7.
  throw new Error("not implemented for non-empty input — see Task 7");
}
