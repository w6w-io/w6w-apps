import { assertEquals } from "@std/assert";
import assistantGet from "../../actions/assistant-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("assistant-get: calls GET /assistant/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1", name: "Support" } }]);
  const out = await assistantGet.execute({ id: "a1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/assistant/a1");
  assertEquals(out, { id: "a1", name: "Support" });
});

Deno.test("assistant-get: encodes the id into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assistantGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/assistant/a%2Fb");
});

Deno.test("assistant-get: strips a secret out of the response", async () => {
  const { ctx } = mockCtx([{ body: { id: "a1", server: { headers: { apiKey: "shh" } } } }]);
  const out = await assistantGet.execute({ id: "a1" }, ctx) as Record<string, unknown>;
  assertEquals((out.server as Record<string, unknown>)?.headers, {});
});
