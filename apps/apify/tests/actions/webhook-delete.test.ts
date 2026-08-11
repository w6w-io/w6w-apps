import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs and reports the 204 with no body to parse", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await webhookDelete.execute({ webhookId: "w1" }, ctx) as {
    webhookId: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/w1");
  assertEquals(out, { webhookId: "w1", status: 204 });
});

/**
 * A repeat delete answers 404. It surfaces rather than being swallowed, because
 * a 404 here usually means the id was wrong, not that the work was already done.
 */
Deno.test("webhook-delete: a 404 on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("record-not-found", "Webhook was not found.") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(webhookDelete.execute({ webhookId: "w1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("record-not-found"), true, err.message);
});

Deno.test("webhook-delete: is declared idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
