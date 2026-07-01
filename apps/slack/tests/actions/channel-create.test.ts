import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-create.ts";

Deno.test("channel-create: strips leading # and sends is_private=false by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1", name: "team" } } }]);
  const result = await action.execute!({ name: "#team" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.create");
  assertEquals(JSON.parse(calls[0].body!), { name: "team", is_private: false });
  assertEquals(result, { id: "C1", name: "team" });
});

Deno.test("channel-create: private visibility sets is_private=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: {} } }]);
  await action.execute!({ name: "secret", visibility: "private" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "secret", is_private: true });
});
