import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/planning-get.ts";

Deno.test("planning-get: GETs /plannings/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "pl1" } } }]);
  await action.execute({ planningId: "pl1", include: "order" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/plannings/pl1");
  assertEquals(url.searchParams.get("include"), "order");
});
