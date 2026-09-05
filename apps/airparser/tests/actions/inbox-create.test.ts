import { assertEquals } from "@std/assert";
import inboxCreate from "../../actions/inbox-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inbox-create: posts JSON to /inboxes/create", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "in_1", name: "Invoices" } }]);
  const result = await inboxCreate.execute({ name: "Invoices", llmEngine: "text" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/inboxes/create");
  assertEquals(calls[0].body, JSON.stringify({ name: "Invoices", llm_engine: "text" }));
  assertEquals(result._id, "in_1");
});

Deno.test("inbox-create: omits llm_engine entirely when not chosen", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "in_1", name: "Invoices" } }]);
  await inboxCreate.execute({ name: "Invoices" }, ctx);
  assertEquals(calls[0].body, JSON.stringify({ name: "Invoices" }));
});

Deno.test("inbox-create: perform, not idempotent — creates a new inbox each call", () => {
  assertEquals(inboxCreate.type, "perform");
  assertEquals(inboxCreate.idempotent, false);
});
