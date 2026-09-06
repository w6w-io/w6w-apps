import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: calls GET /call with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1" }] }]);
  const out = await callList.execute({ assistantId: "asst_1", limit: 10 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/call");
  assertEquals(queryOf(calls[0].url), { assistantId: "asst_1", limit: "10" });
  assertEquals(out, { items: [{ id: "c1" }] });
});

Deno.test("call-list: strips secrets out of any embedded transient assistant config", async () => {
  const { ctx } = mockCtx([
    { body: [{ id: "c1", assistant: { credentials: [{ apiKey: "sk-live" }] } }] },
  ]);
  const out = await callList.execute({}, ctx) as { items: Array<Record<string, unknown>> };
  const assistant = out.items[0].assistant as { credentials: Array<Record<string, unknown>> };
  assertEquals(assistant.credentials[0].apiKey, undefined);
});
