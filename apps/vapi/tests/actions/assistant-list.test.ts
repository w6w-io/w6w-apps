import { assertEquals } from "@std/assert";
import assistantList from "../../actions/assistant-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("assistant-list: calls GET /assistant with limit and date filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "a1" }] }]);
  const out = await assistantList.execute({ limit: 50, createdAtGt: "2026-01-01T00:00:00Z" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/assistant");
  assertEquals(queryOf(calls[0].url), { limit: "50", createdAtGt: "2026-01-01T00:00:00Z" });
  assertEquals(out, { items: [{ id: "a1" }] });
});

Deno.test("assistant-list: strips apiKey out of a nested credentials array", async () => {
  const { ctx } = mockCtx([
    { body: [{ id: "a1", credentials: [{ provider: "anthropic", apiKey: "sk-live-x" }] }] },
  ]);
  const out = await assistantList.execute({}, ctx) as { items: Array<Record<string, unknown>> };

  const creds = out.items[0].credentials as Array<Record<string, unknown>>;
  assertEquals(creds[0].apiKey, undefined);
  assertEquals(creds[0].provider, "anthropic");
});

Deno.test("assistant-list: unset filters are omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await assistantList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
