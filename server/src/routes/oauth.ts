import { Router, type Request, type Response } from "express";
import type { ProviderRegistry } from "../oauth/registry.js";
import type { RegisteredProvider } from "../oauth/types.js";

export interface OAuthRouteDeps {
  registry: ProviderRegistry;
  // additional deps wired in later tasks: db, secretService, publicUrl
}

function summary(p: RegisteredProvider) {
  return {
    id: p.config.id,
    displayName: p.config.displayName,
    iconUrl: p.config.iconUrl,
    docUrl: p.config.docUrl,
    scopesOffered: p.config.scopes.offered,
    scopesDefault: p.config.scopes.default,
  };
}

function ensureMember(req: Request, res: Response): boolean {
  const actor = (req as Request & { actor?: { type: string; memberships?: Array<{ companyId: string }> } }).actor;
  const companyId = req.params.companyId;
  if (!actor || actor.type === "none") {
    res.status(401).json({ errorCode: "unauthenticated" });
    return false;
  }
  const ok = (actor.memberships ?? []).some((m) => m.companyId === companyId);
  if (!ok) {
    // 404 not 403, per spec 9.8
    res.status(404).end();
    return false;
  }
  return true;
}

export function oauthRoutes(deps: OAuthRouteDeps): Router {
  const r = Router({ mergeParams: true });

  r.get("/providers", (req, res) => {
    if (!ensureMember(req, res)) return;
    res.json({ providers: deps.registry.list().map(summary) });
  });

  r.get("/providers/:providerId", (req, res) => {
    if (!ensureMember(req, res)) return;
    const p = deps.registry.get(req.params.providerId);
    if (!p) {
      res.status(404).json({ errorCode: "provider_not_found" });
      return;
    }
    res.json(summary(p));
  });

  return r;
}
