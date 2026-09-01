import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-delete.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("subscriber-delete: posts to /api/subscribers/delete.php", async () => {
  const { ctx, calls } = mockCtx([{ body: "true" }], conn);
  const result = await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx);
  assertEquals(calls[0].url, "https://example.com/sendy/api/subscribers/delete.php");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("list_id"), "abc123");
  assertEquals(body.get("email"), "ada@example.com");
  assertEquals(result, { deleted: true });
});

Deno.test("subscriber-delete: a documented error becomes a thrown error", async () => {
  const { ctx } = mockCtx([{ body: "Subscriber does not exist" }], conn);
  await assertRejects(
    async () => await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx),
    Error,
    "Subscriber does not exist",
  );
});
