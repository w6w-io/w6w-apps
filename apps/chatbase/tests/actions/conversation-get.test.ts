import { assertEquals, assertRejects } from "@std/assert";
import conversationGet from "../../actions/conversation-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-get: GET .../conversations/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { id: "c1", messages: [] },
      pagination: { cursor: null, hasMore: false, total: 0 },
    },
  }]);
  const out = await conversationGet.execute({ agentId: "a1", conversationId: "c1" }, ctx) as {
    data: { id: string };
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/conversations/c1");
  assertEquals(out.data.id, "c1");
});

Deno.test("conversation-get: 404 when the conversation isn't API-sourced", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: errorBody("RESOURCE_NOT_FOUND", "The requested resource does not exist."),
    },
  ]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        conversationGet.execute({ agentId: "a1", conversationId: "widget-only" }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("RESOURCE_NOT_FOUND"), true, err.message);
});
