import { assertEquals } from "@std/assert";
import messageCreate from "../../actions/message-create.ts";
import { mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("message-create: posts into the conversation's messages endpoint", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { sId: "m1" } }]);
  await messageCreate.execute(
    { cId: "c1", content: "follow up", username: "workflow", timezone: "UTC" },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/conversations/c1/messages`,
  );
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    content: "follow up",
    mentions: [],
    context: { username: "workflow", timezone: "UTC" },
  });
});

Deno.test("message-create: mentions an agent when agentIds is given", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { sId: "m1" } }]);
  await messageCreate.execute(
    { cId: "c1", content: "hi", agentIds: "agent_1", username: "workflow", timezone: "UTC" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.mentions, [{ configurationId: "agent_1" }]);
});

Deno.test("message-create: is declared non-idempotent", () => {
  assertEquals(messageCreate.idempotent, false);
});
