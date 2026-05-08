import type { V1ServiceAccount, V1RoleBinding } from "@kubernetes/client-node";
import type { KubernetesApiClient } from "../types.js";
import { tenantBaseLabels } from "./labels.js";

export interface BuildAgentServiceAccountInput {
  namespace: string;
  companyId: string;
  companySlug: string;
}

export function buildAgentServiceAccount(input: BuildAgentServiceAccountInput): V1ServiceAccount {
  return {
    apiVersion: "v1",
    kind: "ServiceAccount",
    metadata: {
      name: "paperclip-agent",
      namespace: input.namespace,
      labels: tenantBaseLabels({ companyId: input.companyId, companySlug: input.companySlug }),
    },
    automountServiceAccountToken: false,
  };
}

export interface BuildDriverRoleBindingInput {
  namespace: string;
  driverServiceAccount: { name: string; namespace: string };
  clusterRoleName: string;
  companyId: string;
  companySlug: string;
}

export function buildDriverRoleBinding(input: BuildDriverRoleBindingInput): V1RoleBinding {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "RoleBinding",
    metadata: {
      name: "paperclip-driver",
      namespace: input.namespace,
      labels: tenantBaseLabels({ companyId: input.companyId, companySlug: input.companySlug }),
    },
    subjects: [{
      kind: "ServiceAccount",
      name: input.driverServiceAccount.name,
      namespace: input.driverServiceAccount.namespace,
    }],
    roleRef: {
      kind: "ClusterRole",
      apiGroup: "rbac.authorization.k8s.io",
      name: input.clusterRoleName,
    },
  };
}

export async function applyAgentServiceAccount(client: KubernetesApiClient, sa: V1ServiceAccount): Promise<void> {
  const ns = sa.metadata!.namespace!;
  const name = sa.metadata!.name!;
  try {
    await client.core.readNamespacedServiceAccount(name, ns);
    await client.core.patchNamespacedServiceAccount(name, ns, sa, undefined, undefined, undefined, undefined, undefined, {
      headers: { "Content-Type": "application/strategic-merge-patch+json" },
    } as never);
  } catch (err) {
    if ((err as { response?: { statusCode?: number } })?.response?.statusCode === 404) {
      await client.core.createNamespacedServiceAccount(ns, sa);
      return;
    }
    throw err;
  }
}

export async function applyDriverRoleBinding(client: KubernetesApiClient, rb: V1RoleBinding): Promise<void> {
  const ns = rb.metadata!.namespace!;
  const name = rb.metadata!.name!;
  try {
    await client.rbac.readNamespacedRoleBinding(name, ns);
    // RoleBindings have an immutable roleRef. Safe path is delete+create.
    await client.rbac.deleteNamespacedRoleBinding(name, ns);
    await client.rbac.createNamespacedRoleBinding(ns, rb);
  } catch (err) {
    if ((err as { response?: { statusCode?: number } })?.response?.statusCode === 404) {
      await client.rbac.createNamespacedRoleBinding(ns, rb);
      return;
    }
    throw err;
  }
}
