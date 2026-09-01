import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-unsubscribe.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("subscriber-unsubscribe: posts to /unsubscribe", async () => {
  const { ctx, calls } = mockCtx([{ body: "true" }], conn);
  const result = await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx);
  assertEquals(calls[0].url, "https://example.com/sendy/unsubscribe");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("email"), "ada@example.com");
  assertEquals(body.get("list"), "abc123");
  assertEquals(body.get("boolean"), "true");
  assertEquals(result, { unsubscribed: true });
});

Deno.test("subscriber-unsubscribe: a documented error becomes a thrown error", async () => {
  const { ctx } = mockCtx([{ body: "Email does not exist." }], conn);
  await assertRejects(
    async () => await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx),
    Error,
    "Email does not exist.",
  );
});
