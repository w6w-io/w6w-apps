import { assertEquals } from "@std/assert";
import membershipList from "../../actions/membership-list.ts";
import { mockCtx, mockCtxWithAccount, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("membership-list: GETs /memberships with the account_id and status filters", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "mem_1" }]) }]);
  const out = await membershipList.execute(
    { accountId: "biz_1", status: "active" },
    ctx,
  ) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/memberships");
  assertEquals(queryOf(calls[0].url).account_id, "biz_1");
  assertEquals(queryOf(calls[0].url).status, "active");
  assertEquals(out.data.length, 1);
});

Deno.test("membership-list: pins Api-Version-Date on every request", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await membershipList.execute({}, ctx);
  assertEquals(calls[0].headers["api-version-date"], "2026-08-25-2");
});

Deno.test("membership-list: falls back to the connection's own accountId when omitted", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_fromconn");
  await membershipList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).account_id, "biz_fromconn");
});

Deno.test("membership-list: an explicit accountId wins over the connection's own", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_fromconn");
  await membershipList.execute({ accountId: "biz_explicit" }, ctx);
  assertEquals(queryOf(calls[0].url).account_id, "biz_explicit");
});

Deno.test("membership-list: repeats plan_id-style filters bracketed", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await membershipList.execute({ productId: "prod_1" }, ctx);
  assertEquals(queryOf(calls[0].url).product_id, "prod_1");
});

Deno.test("membership-list: is not idempotency-scoped — a read action, no Idempotency-Key sent", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await membershipList.execute({}, ctx);
  assertEquals(calls[0].headers["idempotency-key"], undefined);
});
