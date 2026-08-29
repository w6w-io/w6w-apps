import { assertEquals } from "@std/assert";
import accountWarmupAnalyticsGet from "../../actions/account-warmup-analytics-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-warmup-analytics-get: POSTs /accounts/warmup-analytics with the email list", async () => {
  const { ctx, calls } = mockCtx([{ body: { aggregate_data: {} } }]);
  await accountWarmupAnalyticsGet.execute({ emails: ["a@b.com"] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/warmup-analytics");
  assertEquals(JSON.parse(calls[0].body!), { emails: ["a@b.com"] });
});

Deno.test("account-warmup-analytics-get: is a read action despite the POST verb", () => {
  assertEquals(accountWarmupAnalyticsGet.type, "read");
});
