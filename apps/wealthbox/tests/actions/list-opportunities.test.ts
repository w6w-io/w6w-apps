import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-opportunities.ts";

Deno.test("list-opportunities: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-opportunities: GETs /opportunities with mapped filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { opportunities: [] } }]);
  await action.execute({ includeClosed: true, order: "created" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/opportunities");
  assertEquals(url.searchParams.get("include_closed"), "true");
  assertEquals(url.searchParams.get("order"), "created");
});
