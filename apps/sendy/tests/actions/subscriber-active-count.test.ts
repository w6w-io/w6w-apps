import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-active-count.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("subscriber-active-count: a bare integer body is the count", async () => {
  const { ctx, calls } = mockCtx([{ body: "42" }], conn);
  const result = await action.execute({ listId: "abc123" }, ctx);
  assertEquals(
    calls[0].url,
    "https://example.com/sendy/api/subscribers/active-subscriber-count.php",
  );
  assertEquals(result, { count: 42 });
});

Deno.test("subscriber-active-count: a non-numeric body is a documented error", async () => {
  const { ctx } = mockCtx([{ body: "Invalid API key" }], conn);
  await assertRejects(
    async () => await action.execute({ listId: "abc123" }, ctx),
    Error,
    "Invalid API key",
  );
});
