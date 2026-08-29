import { assertEquals } from "@std/assert";
import requestRate, { RATE_URL, readWindows } from "../../health/request-rate.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("request-rate: reads the same whoami endpoint the auth probe uses", () => {
  assertEquals(RATE_URL, "https://api.apollo.io/api/v1/users/api_profile");
  assertEquals(requestRate.credential, "signed");
});

Deno.test("readWindows: reads all three windows when all three headers are present", () => {
  const headers = new Headers({
    "x-rate-limit-minute": "50",
    "x-minute-usage": "10",
    "x-minute-requests-left": "40",
    "x-rate-limit-hourly": "200",
    "x-hourly-usage": "5",
    "x-hourly-requests-left": "195",
    "x-rate-limit-24-hour": "600",
    "x-24-hour-usage": "5",
    "x-24-hour-requests-left": "595",
  });
  const quotas = readWindows(headers);
  assertEquals(quotas.length, 3);
  assertEquals(quotas[0], {
    id: "users-api-profile-per-minute",
    limit: 50,
    remaining: 40,
    unit: "requests",
  });
});

Deno.test("readWindows: a window with no limit header is 'not metered here', not a zero", () => {
  const headers = new Headers({ "x-rate-limit-minute": "50", "x-minute-requests-left": "40" });
  const quotas = readWindows(headers);
  assertEquals(quotas.length, 1);
  assertEquals(quotas[0].id, "users-api-profile-per-minute");
});

Deno.test("readWindows: derives remaining from usage when requests-left is absent", () => {
  const headers = new Headers({ "x-rate-limit-minute": "50", "x-minute-usage": "10" });
  const quotas = readWindows(headers);
  assertEquals(quotas[0].remaining, 40);
});

Deno.test("readWindows: no rate-limit headers at all returns an empty list", () => {
  assertEquals(readWindows(new Headers()), []);
});

Deno.test("request-rate: reports ok with healthy headroom", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-rate-limit-minute": "50",
        "x-minute-requests-left": "40",
      },
    },
  ]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(calls[0].url, RATE_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 1);
});

Deno.test("request-rate: near-exhausted headroom reports degraded, never down", async () => {
  const { ctx } = mockCtx([
    {
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-rate-limit-minute": "50",
        "x-minute-requests-left": "0",
      },
    },
  ]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("request-rate: no rate-limit headers on the response reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1" } }]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("request-rate: a refused read reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "nope" }]);
  const report = await requestRate.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
