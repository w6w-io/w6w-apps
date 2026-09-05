import { assertEquals } from "@std/assert";
import conversationGet from "../../actions/conversation-get.ts";
import { mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-get: hits /assistant/conversations/{cId} with limit + lastValue", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { body: { conversation: { sId: "c1", content: [] } } },
  ]);
  const result = await conversationGet.execute({ cId: "c1", limit: 10, lastValue: "5" }, ctx);

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/conversations/c1`,
  );
  assertEquals(queryOf(calls[0].url), { limit: "10", lastValue: "5" });
  assertEquals(result, { conversation: { sId: "c1", content: [] } });
});

Deno.test("conversation-get: omits limit/lastValue entirely when unset", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { conversation: { sId: "c1" } } }]);
  await conversationGet.execute({ cId: "c1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
