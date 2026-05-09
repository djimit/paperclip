import type { V1Secret, V1OwnerReference } from "@kubernetes/client-node";
import type { KubernetesApiClient } from "../types.js";
import { tenantBaseLabels, PAPERCLIP_RUN_ID } from "./labels.js";

export interface BuildEphemeralSecretInput {
  namespace: string;
  agentSlug: string;
  runUlid: string;
  companyId: string;
  companySlug: string;
  runId: string;
  /** Plaintext key/value pairs to materialize. Will be base64-encoded. */
  data: Record<string, string>;
  /** OwnerReference to the Job so the Secret is auto-GC'd with TTL. */
  ownerJob: { name: string; uid: string };
}

export function buildEphemeralSecret(input: BuildEphemeralSecretInput): V1Secret {
  const ownerReferences: V1OwnerReference[] = [{
    apiVersion: "batch/v1",
    kind: "Job",
    name: input.ownerJob.name,
    uid: input.ownerJob.uid,
    controller: true,
    blockOwnerDeletion: true,
  }];

  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.data)) {
    data[k] = Buffer.from(v, "utf-8").toString("base64");
  }

  return {
    apiVersion: "v1",
    kind: "Secret",
    type: "Opaque",
    metadata: {
      name: `agent-${input.agentSlug}-run-${input.runUlid}-env`,
      namespace: input.namespace,
      labels: {
        ...tenantBaseLabels({ companyId: input.companyId, companySlug: input.companySlug }),
        [PAPERCLIP_RUN_ID]: input.runId,
      },
      ownerReferences,
    },
    data,
  };
}

/**
 * Apply the Secret. NOT idempotent on update — Secrets are created once per run and never updated.
 * If a Secret with the same name exists (collision impossible with ULIDs but defensive), this throws.
 */
export async function applyEphemeralSecret(client: KubernetesApiClient, secret: V1Secret): Promise<void> {
  const ns = secret.metadata!.namespace!;
  await client.core.createNamespacedSecret(ns, secret);
}

/**
 * Best-effort delete used when Job creation fails AFTER Secret creation but BEFORE
 * the Job's OwnerReference is established.
 */
export async function deleteEphemeralSecret(client: KubernetesApiClient, namespace: string, name: string): Promise<void> {
  try {
    await client.core.deleteNamespacedSecret(name, namespace);
  } catch (err) {
    if ((err as { response?: { statusCode?: number } })?.response?.statusCode === 404) return;
    throw err;
  }
}
