import { assert, assertEquals } from "@std/assert";
import requestRate, { PROBE_URL, WARN_FRACTION } from "../../health/request-rate.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("request-rate: probes GET /projects, the same endpoint the auth probe uses", () => {
  assertEquals(PROBE_URL, "https://api.lokalise.com/api2/projects");
});

Deno.test("request-rate: plenty of headroom is ok", async () => {
  const { ctx } = mockCtx([
    {
      body: { projects: [] },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "10, 10;w=1",
        "x-ratelimit-remaining": "9",
      },
    },
  ]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 9);
  assertEquals(report.quota?.[0].limit, 10);
});

Deno.test(`request-rate: at or below ${WARN_FRACTION * 100}% remaining is degraded`, async () => {
  const { ctx } = mockCtx([
    {
      body: { projects: [] },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "10, 10;w=1",
        "x-ratelimit-remaining": "2",
      },
    },
  ]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("request-rate: zero remaining is degraded and named in the message", async () => {
  const { ctx } = mockCtx([
    {
      body: { projects: [] },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "10, 10;w=1",
        "x-ratelimit-remaining": "0",
      },
    },
  ]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("0/10"));
});

Deno.test("request-rate: a live 429 IS the signal, reported as degraded rather than a probe failure", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { message: "Too many requests", code: 429 } },
  }]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/rate-limiting/i.test(report.message ?? ""));
});

Deno.test("request-rate: a response with no rate-limit headers is unknown", async () => {
  const { ctx } = mockCtx([{ body: { projects: [] } }]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("request-rate: an unrelated non-2xx is unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("request-rate: signed, connection-scoped quota check", () => {
  assertEquals(requestRate.credential, "signed");
  assertEquals(requestRate.scope, "connection");
  assertEquals(requestRate.kind, "quota");
});
