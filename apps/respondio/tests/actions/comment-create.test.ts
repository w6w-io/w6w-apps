import { assertEquals, assertRejects } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-create: POSTs {text} to /contact/{identifier}/comment", async () => {
  const { ctx, calls } = mockCtx([
    { body: { contactId: 1, text: "Called back", created_at: 1700000000 } },
  ]);
  const out = await commentCreate.execute(
    { identifier: "id:1", text: "Called back" },
    ctx,
  ) as { text: string };

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/comment");
  assertEquals(JSON.parse(calls[0].body!), { text: "Called back" });
  assertEquals(out.text, "Called back");
});

Deno.test("comment-create: a comment over 1000 characters is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await commentCreate.execute({ identifier: "id:1", text: "x".repeat(1001) }, ctx),
    Error,
    "exceeds",
  );
  assertEquals(calls.length, 0);
});

Deno.test("comment-create: is not idempotent", () => {
  assertEquals(commentCreate.idempotent, false);
});
