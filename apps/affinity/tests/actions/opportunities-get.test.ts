import { assertEquals } from "@std/assert";
import opportunitiesGet from "../../actions/opportunities-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("opportunities-get: calls GET /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 117, name: "Affinity Opportunity" } }]);
  const out = await opportunitiesGet.execute({ opportunityId: 117 }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/opportunities/117");
  assertEquals(out.name, "Affinity Opportunity");
});
