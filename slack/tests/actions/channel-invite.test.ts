import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-invite.ts";

Deno.test("channel-invite: POSTs channel + users CSV to /conversations.invite", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1" } } }]);
  const result = await action.execute!({ channelId: "C1", userIds: "U1,U2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.invite");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", users: "U1,U2" });
  assertEquals(result, { id: "C1" });
});
