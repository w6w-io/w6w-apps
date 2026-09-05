import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-remove-leads.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("list-remove-leads: DELETEs with repeated id query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1, status: "removed" }] } },
  ], conn);
  const out = await action.execute!({ listId: 100, leadIds: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/lists/100/leads.json");
  assertEquals(url.searchParams.getAll("id"), ["1"]);
  assertEquals(out, [{ id: 1, status: "removed" }]);
});

Deno.test("list-remove-leads: idempotent is true — removing a non-member is a no-op skip, not an error", () => {
  assertEquals(action.idempotent, true);
});
