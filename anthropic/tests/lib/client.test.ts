import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { AnthropicClient, parseJsonl } from "../../lib/client.ts";

Deno.test("AnthropicClient: attaches anthropic-version on every request", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new AnthropicClient(ctx);
  await client.request("/v1/models");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
});

Deno.test("AnthropicClient: merges extra headers (e.g. anthropic-beta) without dropping version", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new AnthropicClient(ctx);
  await client.request("/v1/files", { headers: { "anthropic-beta": "files-api-2025-04-14" } });
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(calls[0].headers["anthropic-beta"], "files-api-2025-04-14");
});

Deno.test("AnthropicClient: throws with body detail on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "bad request" } }]);
  const client = new AnthropicClient(ctx);
  await assertRejects(
    () => client.request("/v1/messages", { method: "POST", body: {} }),
    Error,
    "Anthropic 400",
  );
});

Deno.test("AnthropicClient: asText returns the raw text body (for JSONL)", async () => {
  const jsonl = `{"custom_id":"a","result":{"type":"succeeded"}}\n{"custom_id":"b","result":{"type":"errored"}}`;
  const { ctx } = mockCtx([{ body: jsonl, headers: { "content-type": "application/x-jsonlines" } }]);
  const client = new AnthropicClient(ctx);
  const text = await client.request<string>("/v1/messages/batches/x/results", { asText: true });
  assertEquals(typeof text, "string");
  assertEquals(text.split("\n").length, 2);
});

Deno.test("parseJsonl: decodes newline-delimited JSON into an array", () => {
  const jsonl = `{"custom_id":"a","result":{"type":"succeeded"}}\n{"custom_id":"b","result":{"type":"errored"}}\n`;
  const rows = parseJsonl<{ custom_id: string; result: { type: string } }>(jsonl);
  assertEquals(rows.length, 2);
  assertEquals(rows[0].custom_id, "a");
  assertEquals(rows[1].result.type, "errored");
});

Deno.test("parseJsonl: skips blank lines but keeps content lines", () => {
  const jsonl = `\n{"a":1}\n\n{"b":2}\n\n`;
  const rows = parseJsonl<{ a?: number; b?: number }>(jsonl);
  assertEquals(rows.length, 2);
});
