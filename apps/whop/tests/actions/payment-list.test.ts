import { assert, assertEquals } from "@std/assert";
import paymentList from "../../actions/payment-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-list: GETs /payments using company_id, not account_id", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "pay_1" }]) }]);
  await paymentList.execute({ companyId: "biz_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments");
  assertEquals(queryOf(calls[0].url).company_id, "biz_1");
  assertEquals(queryOf(calls[0].url).account_id, undefined);
});

Deno.test("payment-list: array filters repeat the bare key — no [] suffix (Legacy style)", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await paymentList.execute({ companyId: "biz_1", statuses: ["paid", "refunded"] }, ctx);
  assertEquals(queryOf(calls[0].url).statuses, ["paid", "refunded"]);
  assertEquals(queryOf(calls[0].url)["statuses[]"], undefined);
});

Deno.test("payment-list: strips client_secret from every returned payment", async () => {
  const { ctx } = mockCtx([
    { body: pageEnvelope([{ id: "pay_1", client_secret: "pay_1_secret_v1_xxxx" }]) },
  ]);
  const out = await paymentList.execute({ companyId: "biz_1" }, ctx) as {
    data: Array<Record<string, unknown>>;
  };
  assert(!("client_secret" in out.data[0]));
  assertEquals(out.data[0].id, "pay_1");
});
