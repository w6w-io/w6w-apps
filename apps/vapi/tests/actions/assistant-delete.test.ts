import { assertEquals, assertRejects } from "@std/assert";
import assistantDelete from "../../actions/assistant-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("assistant-delete: calls DELETE /assistant/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1" } }]);
  const out = await assistantDelete.execute({ id: "a1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/assistant/a1");
  assertEquals(out, { id: "a1" });
});

Deno.test("assistant-delete: is declared idempotent", () => {
  assertEquals(assistantDelete.idempotent, true);
});

/** The pinned-assistant 409 carries a distinct error code, surfaced verbatim. */
Deno.test("assistant-delete: a pinned assistant surfaces the vendor's own reason", async () => {
  const { ctx } = mockCtx([
    {
      status: 409,
      body: errorBody(
        "This assistant is pinned to phone number +14155551234 and cannot be deleted.",
        "assistant_pinned",
        409,
      ),
    },
  ]);
  await assertRejects(
    async () => await assistantDelete.execute({ id: "a1" }, ctx),
    Error,
    "assistant_pinned",
  );
});
