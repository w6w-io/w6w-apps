import { assertEquals } from "@std/assert";
import opportunitiesUpdate from "../../actions/opportunities-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("opportunities-update: PUTs (not POSTs) to /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 120611418, name: "Penny Opp" } }]);
  await opportunitiesUpdate.execute({ opportunityId: 120611418, name: "Penny Opp" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/opportunities/120611418");
  assertEquals(JSON.parse(calls[0].body!), { name: "Penny Opp" });
});
