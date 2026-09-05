import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-add-leads.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("list-add-leads: POSTs with repeated id query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1, status: "added" }, { id: 2, status: "added" }] } },
  ], conn);
  const out = await action.execute!({ listId: 100, leadIds: "1,2" }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/lists/100/leads.json");
  assertEquals(url.searchParams.getAll("id"), ["1", "2"]);
  assertEquals(calls[0].body, null);
  assertEquals(out, [{ id: 1, status: "added" }, { id: 2, status: "added" }]);
});

Deno.test("list-add-leads: requires at least one numeric lead ID", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ listId: 100, leadIds: "" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("list-add-leads: idempotent is true — adding an existing member is a no-op", () => {
  assertEquals(action.idempotent, true);
});
