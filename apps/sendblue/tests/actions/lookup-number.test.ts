import { assertEquals } from "@std/assert";
import lookupNumber from "../../actions/lookup-number.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("lookup-number: GETs /api/evaluate-service with the number as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: "+1", service: "iMessage" } }]);
  const out = await lookupNumber.execute({ number: "+1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/evaluate-service");
  assertEquals(queryOf(calls[0].url), { number: "+1" });
  assertEquals(out.service, "iMessage");
});
