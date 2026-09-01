import { assert, assertEquals } from "@std/assert";
import quota, { QUOTA_DIMENSIONS, readDimension, TEAMS_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: reads GET /teams", () => {
  assertEquals(TEAMS_URL, "https://api.lokalise.com/api2/teams");
});

Deno.test("QUOTA_DIMENSIONS: excludes the deprecated mau field", () => {
  assert(!QUOTA_DIMENSIONS.some((d) => d.key === "mau"));
  assertEquals(QUOTA_DIMENSIONS.map((d) => d.key).sort(), [
    "ai_words",
    "keys",
    "projects",
    "trafficBytes",
    "users",
  ]);
});

Deno.test("readDimension: a non-positive ceiling reads as 'not configured', not exhausted", () => {
  const dim = QUOTA_DIMENSIONS.find((d) => d.id === "keys")!;
  const reading = readDimension("Acme", dim, { keys: 999999 }, { keys: 0 });
  assertEquals(reading?.state, "ok");
});

Deno.test("readDimension: an enormous ceiling (Lokalise's own 99999999 example) reads as healthy at low usage", () => {
  const dim = QUOTA_DIMENSIONS.find((d) => d.id === "projects")!;
  const reading = readDimension("Acme", dim, { projects: 4 }, { projects: 99999999 });
  assertEquals(reading?.state, "ok");
});

Deno.test("readDimension: at or above the warn fraction is degraded, with a named note", () => {
  const dim = QUOTA_DIMENSIONS.find((d) => d.id === "keys")!;
  const reading = readDimension("Acme", dim, { keys: 9500 }, { keys: 10000 });
  assertEquals(reading?.state, "degraded");
  assert(reading?.note?.includes("Acme"));
  assert(reading?.note?.includes("keys"));
});

Deno.test("readDimension: at 100% is still degraded, not down — a queued upgrade, not an outage", () => {
  const dim = QUOTA_DIMENSIONS.find((d) => d.id === "keys")!;
  const reading = readDimension("Acme", dim, { keys: 10000 }, { keys: 10000 });
  assertEquals(reading?.state, "degraded");
});

Deno.test("readDimension: a missing usage or limit yields no reading", () => {
  const dim = QUOTA_DIMENSIONS.find((d) => d.id === "keys")!;
  assertEquals(readDimension("Acme", dim, {}, { keys: 10000 }), undefined);
  assertEquals(readDimension("Acme", dim, { keys: 1 }, {}), undefined);
});

Deno.test("quota check: reports the worst dimension across every team", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        teams: [
          {
            team_id: 1,
            name: "Healthy Team",
            quota_usage: { users: 1, keys: 1, projects: 1, trafficBytes: 1, ai_words: 1 },
            quota_allowed: {
              users: 10,
              keys: 10000,
              projects: 10,
              trafficBytes: 100,
              ai_words: 100,
            },
          },
          {
            team_id: 2,
            name: "Exhausted Team",
            quota_usage: { keys: 9999 },
            quota_allowed: { keys: 10000 },
          },
        ],
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Exhausted Team"));
  assert((report.quota?.length ?? 0) >= 5);
});

Deno.test("quota check: a non-2xx is unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota check: no teams is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: { teams: [] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: signed and connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
});
