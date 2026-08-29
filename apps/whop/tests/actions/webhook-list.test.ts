import { assertEquals, assertRejects } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, mockCtxWithAccount, pageEnvelope, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: requires accountId — throws before any request when absent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await webhookList.execute({}, ctx),
    Error,
    "accountId is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-list: uses the connection's own accountId when not given explicitly", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_conn");
  await webhookList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).account_id, "biz_conn");
});

Deno.test("webhook-list: filters by hasFailures", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }]);
  await webhookList.execute({ hasFailures: true }, ctx);
  assertEquals(queryOf(calls[0].url).has_failures, "true");
});
