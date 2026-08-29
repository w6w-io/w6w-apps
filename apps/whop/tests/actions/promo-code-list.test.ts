import { assertEquals, assertRejects } from "@std/assert";
import promoCodeList from "../../actions/promo-code-list.ts";
import { mockCtx, mockCtxWithAccount, pageEnvelope, queryOf } from "../_helpers.ts";

Deno.test("promo-code-list: requires accountId — throws before any request when absent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await promoCodeList.execute({}, ctx),
    Error,
    "accountId is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("promo-code-list: uses the connection's own accountId when not given explicitly", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_conn");
  await promoCodeList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).account_id, "biz_conn");
});

Deno.test("promo-code-list: filters by status", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }]);
  await promoCodeList.execute({ status: "active" }, ctx);
  assertEquals(queryOf(calls[0].url).status, "active");
});
