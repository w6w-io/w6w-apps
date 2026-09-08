import { assertEquals } from "@std/assert";
import chatCompletions from "../../actions/chat-completions.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("chat-completions: posts the caller's body verbatim to /v1/chat/completions", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chatcmpl-1", choices: [] } }]);
  const body = { model: "jina-vlm", messages: [{ role: "user", content: "hi" }] };
  await chatCompletions.execute({ body }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/chat/completions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), body);
});
