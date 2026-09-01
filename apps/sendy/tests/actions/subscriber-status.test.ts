import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-status.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("subscriber-status: reads one of the documented status strings", async () => {
  const { ctx, calls } = mockCtx([{ body: "Bounced" }], conn);
  const result = await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx);
  assertEquals(calls[0].url, "https://example.com/sendy/api/subscribers/subscription-status.php");
  assertEquals(result, { status: "Bounced" });
});

Deno.test("subscriber-status: a documented error becomes a thrown error, not a status", async () => {
  const { ctx } = mockCtx([{ body: "Email does not exist in list" }], conn);
  await assertRejects(
    async () => await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx),
    Error,
    "Email does not exist in list",
  );
});
