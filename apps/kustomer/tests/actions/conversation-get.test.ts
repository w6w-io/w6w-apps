import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/conversation-get.ts";

Deno.test("conversation-get: GETs /conversations/{id} and unwraps data", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "c1" } } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/conversations/c1");
  assertEquals(out, { id: "c1" });
});
