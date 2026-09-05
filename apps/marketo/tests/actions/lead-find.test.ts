import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-find.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("lead-find: GETs /rest/v1/leads.json with filterType/filterValues", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { success: true, result: [{ id: 1 }, { id: 2 }] } }],
    conn,
  );
  const out = await action.execute!({ filterType: "email", filterValues: "a@b.com,c@d.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/leads.json");
  assertEquals(url.searchParams.get("filterType"), "email");
  assertEquals(url.searchParams.get("filterValues"), "a@b.com,c@d.com");
  assertEquals(out, [{ id: 1 }, { id: 2 }]);
});

Deno.test("lead-find: returns an empty array when nothing matches", async () => {
  const { ctx } = mockCtx([{ body: { success: true, result: [] } }], conn);
  const out = await action.execute!({ filterType: "id", filterValues: "999999" }, ctx);
  assertEquals(out, []);
});

Deno.test("lead-find: requires filterType and filterValues", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ filterType: "", filterValues: "" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("lead-find: is a search action, not a read", () => {
  assertEquals(action.type, "search");
});
