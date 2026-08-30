import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import estimateGet from "../../actions/estimate-get.ts";

Deno.test("estimate-get: returns the estimate by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { business: { estimate: { id: "e1", estimateNumber: "EST-001" } } } },
  }]);
  const out = await estimateGet.execute({ businessId: "b1", estimateId: "e1" }, ctx) as {
    estimateNumber: string;
  };
  assertEquals(out.estimateNumber, "EST-001");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.estimateId, "e1");
});

Deno.test("estimate-get: type/resource metadata", () => {
  assertEquals(estimateGet.type, "read");
  assertEquals(estimateGet.resource, "estimate");
});
