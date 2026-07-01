import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-company.ts";

Deno.test("get-company: GETs /crm/v3/objects/companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const out = await action.execute!({ id: "c1", associations: "contacts,deals" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v3/objects/companies/c1");
  assertEquals(url.searchParams.getAll("associations"), ["contacts", "deals"]);
  assertEquals((out as { id: string }).id, "c1");
});
