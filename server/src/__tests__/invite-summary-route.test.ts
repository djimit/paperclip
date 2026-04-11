import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { accessRoutes } from "../routes/access.js";
import { errorHandler } from "../middleware/index.js";

function createSelectChain(rows: unknown[]) {
  const query = {
    leftJoin() {
      return query;
    },
    where() {
      return Promise.resolve(rows);
    },
  };
  return {
    from() {
      return query;
    },
  };
}

function createDbStub(inviteRows: unknown[], companyRows: unknown[]) {
  let selectCall = 0;
  return {
    select() {
      selectCall += 1;
      return selectCall === 1
        ? createSelectChain(inviteRows)
        : createSelectChain(companyRows);
    },
  };
}

function createApp(db: Record<string, unknown>) {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).actor = { type: "anon" };
    next();
  });
  app.use(
    "/api",
    accessRoutes(db as any, {
      deploymentMode: "local_trusted",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    }),
  );
  app.use(errorHandler);
  return app;
}

describe("GET /invites/:token", () => {
  it("returns company branding in the invite summary response", async () => {
    const invite = {
      id: "invite-1",
      companyId: "company-1",
      inviteType: "company_join",
      allowedJoinTypes: "human",
      tokenHash: "hash",
      defaultsPayload: null,
      expiresAt: new Date("2027-03-07T00:10:00.000Z"),
      invitedByUserId: null,
      revokedAt: null,
      acceptedAt: null,
      createdAt: new Date("2026-03-07T00:00:00.000Z"),
      updatedAt: new Date("2026-03-07T00:00:00.000Z"),
    };
    const app = createApp(
      createDbStub([invite], [{
        name: "Acme Robotics",
        brandColor: "#114488",
        logoAssetId: "logo-1",
      }]),
    );

    const res = await request(app).get("/api/invites/pcp_invite_test");

    expect(res.status).toBe(200);
    expect(res.body.companyId).toBe("company-1");
    expect(res.body.companyName).toBe("Acme Robotics");
    expect(res.body.companyBrandColor).toBe("#114488");
    expect(res.body.companyLogoUrl).toBe("/api/assets/logo-1/content");
    expect(res.body.inviteType).toBe("company_join");
  });
});
