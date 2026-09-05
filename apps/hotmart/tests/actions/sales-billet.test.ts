import { assertEquals, assertRejects } from "@std/assert";
import salesBillet from "../../actions/sales-billet.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sales-billet - PUTs to the transaction's billet path and returns the URL", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { billet_url: "https://example.com/x.pdf" },
  }]);
  const out = await salesBillet.execute({ transaction: "HP1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/HP1/billet");
  assertEquals(out, { billet_url: "https://example.com/x.pdf" });
});

Deno.test("sales-billet - is declared idempotent (safe to retry)", () => {
  assertEquals(salesBillet.idempotent, true);
});

Deno.test("sales-billet - surfaces purchase_not_found", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("purchase_not_found", "Purchase not found for the given transaction."),
  }]);
  await assertRejects(
    () => Promise.resolve(salesBillet.execute({ transaction: "nope" }, ctx)),
    Error,
    "purchase_not_found",
  );
});
