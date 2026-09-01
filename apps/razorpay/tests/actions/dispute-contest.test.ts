import { assertEquals } from "@std/assert";
import disputeContest from "../../actions/dispute-contest.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dispute-contest: patches /disputes/{id}/contest, mapping camelCase evidence arrays to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "disp_1", status: "under_review" } }]);
  await disputeContest.execute(
    {
      id: "disp_1",
      action: "submit",
      summary: "Shipped on time, tracking attached.",
      shippingProof: ["doc_1"],
      billingProof: ["doc_2"],
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/disputes/disp_1/contest");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    action: "submit",
    summary: "Shipped on time, tracking attached.",
    shipping_proof: ["doc_1"],
    billing_proof: ["doc_2"],
  });
});

Deno.test("dispute-contest: with no fields set beyond the id, sends an empty body (the 'draft' default is the Param's, not execute's)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "disp_1" } }]);
  await disputeContest.execute({ id: "disp_1" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {});
});
