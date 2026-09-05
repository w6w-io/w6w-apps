import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-get-many.ts";

Deno.test("quote-get-many: GETs /quotes scoped to a client", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ clientId: "cl1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/quotes");
  assertEquals(url.searchParams.get("client_id"), "cl1");
});
