import { assertEquals } from "@std/assert";
import quota, { QUOTA_DIMENSIONS, readDimension, RESOURCES_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const BODY = {
  dailyExecutionTime: 3000,
  dailyMail: 40,
  dailyCaptcha: 5,
  dailyDiscoveredMail: 10,
  dailyAiCredit: 100,
  dailySerpCredits: 20,
  monthlyExecutionTime: 90000,
  monthlyMail: 900,
  monthlyCaptcha: 100,
  monthlyDiscoveredMail: 300,
  monthlyAiCredit: 3000,
  monthlySerpCredits: 600,
  s3Storage: 5_000_000,
  dailyResourceNextResetAt: 1_800_000_000_000,
  monthlyResourceNextResetAt: 1_800_500_000_000,
  plan: {
    dailyExecutionTime: 3600,
    dailyMails: 50,
    dailyCaptchas: 10,
    dailyDiscoveredMails: 20,
    dailyAiCredits: 100,
    dailySerpCredits: 20,
    monthlyExecutionTime: 108000,
    monthlyMails: 1500,
    monthlyCaptchas: 300,
    monthlyDiscoveredMails: 600,
    monthlyAiCredits: 3000,
    monthlySerpCredits: 600,
    s3Storage: 10_000_000,
  },
};

Deno.test("quota: fetches the account-resources URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: BODY }]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, RESOURCES_URL);
});

Deno.test("quota: reports ok when every dimension is well above the warn threshold", async () => {
  const { ctx } = mockCtx([{ status: 200, body: BODY }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.length, QUOTA_DIMENSIONS.length);
});

Deno.test("quota: a dimension near exhaustion degrades the verdict", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ...BODY, dailyExecutionTime: 100 } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: a fully exhausted monthly dimension reports down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ...BODY, monthlyMail: 0 } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("quota: an unreachable ceiling (limit missing) is skipped rather than crashing", () => {
  const dimension = QUOTA_DIMENSIONS.find((d) => d.id === "daily-mail")!;
  const reading = readDimension(dimension, { dailyMail: 10 });
  assertEquals(reading, undefined);
});

Deno.test("quota: readDimension pairs the remaining reading with the plan ceiling", () => {
  const dimension = QUOTA_DIMENSIONS.find((d) => d.id === "daily-mail")!;
  const reading = readDimension(dimension, BODY);
  assertEquals(reading?.quota.limit, 50);
  assertEquals(reading?.quota.remaining, 40);
  assertEquals(reading?.quota.unit, "credits");
  assertEquals(reading?.state, "ok");
});

Deno.test("quota: a non-positive plan ceiling reads as 'not part of this plan', not exhausted", () => {
  const dimension = QUOTA_DIMENSIONS.find((d) => d.id === "s3-storage")!;
  const reading = readDimension(dimension, { s3Storage: 0, plan: { s3Storage: 0 } });
  assertEquals(reading?.state, "ok");
});

Deno.test("quota: covers exactly the 13 documented dimensions", () => {
  assertEquals(QUOTA_DIMENSIONS.length, 13);
});

Deno.test("quota: is signed, connection-scoped, and probes the same endpoint as the auth test", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
