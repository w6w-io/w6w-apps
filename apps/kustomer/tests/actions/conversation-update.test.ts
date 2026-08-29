import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/conversation-update.ts";

Deno.test("conversation-update: PATCHes /conversations/{id} under application/json-patch+json", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "c1" } } }]);
  const out = await action.execute({ id: "c1", status: "done" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/conversations/c1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], "application/json-patch+json");
  assertEquals(JSON.parse(calls[0].body!), { status: "done" });
  assertEquals(out, { id: "c1" });
});

Deno.test("conversation-update: is idempotent — a partial attribute merge", () => {
  assertEquals(action.idempotent, true);
});
