import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/view-get.ts";

Deno.test("view-get: GETs /views/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 21, name: "My view" } }]);
  const out = await action.execute({ viewId: 21 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/views/21");
  assertEquals(out, { id: 21, name: "My view" });
});
