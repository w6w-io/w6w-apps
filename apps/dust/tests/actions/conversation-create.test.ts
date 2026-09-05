import { assertEquals } from "@std/assert";
import conversationCreate from "../../actions/conversation-create.ts";
import { mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("conversation-create: defaults blocking to true, opposite the vendor's own default", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { body: { conversation: { sId: "c1" } } },
  ]);
  await conversationCreate.execute(
    { content: "hello", username: "workflow", timezone: "UTC" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.blocking, true);
  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/conversations`,
  );
  assertEquals(calls[0].method, "POST");
});

Deno.test("conversation-create: builds the Message body with mentions and context", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { conversation: { sId: "c1" } } }]);
  await conversationCreate.execute(
    {
      content: "hi there",
      agentIds: "agent_1,agent_2",
      username: "alice",
      timezone: "America/New_York",
      title: "My conversation",
      blocking: false,
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "My conversation");
  assertEquals(body.blocking, false);
  assertEquals(body.message.content, "hi there");
  assertEquals(body.message.mentions, [
    { configurationId: "agent_1" },
    { configurationId: "agent_2" },
  ]);
  assertEquals(body.message.context, { username: "alice", timezone: "America/New_York" });
});

Deno.test("conversation-create: an empty spaceId is omitted rather than sent as ''", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { conversation: { sId: "c1" } } }]);
  await conversationCreate.execute(
    { content: "hi", username: "workflow", timezone: "UTC", spaceId: "" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.spaceId, undefined);
  assertEquals("spaceId" in body, false);
});

Deno.test("conversation-create: is declared non-idempotent", () => {
  assertEquals(conversationCreate.idempotent, false);
});
