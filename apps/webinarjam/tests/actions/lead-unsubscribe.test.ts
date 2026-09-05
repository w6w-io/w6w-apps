import { assertEquals, assertRejects } from "@std/assert";
import leadUnsubscribe from "../../actions/lead-unsubscribe.ts";
import { failure, formOf, mockWebinarJamCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-unsubscribe: POSTs webinar_id and lead_id and reports success on 204", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ status: 204 }]);
  const out = await leadUnsubscribe.execute(
    { product: "webinarjam", webinarId: 561, leadId: 818 },
    ctx,
  ) as { success: boolean };
  assertEquals(pathOf(calls[0].url), "/webinarjam/unsubscribe");
  const sent = formOf(calls[0].body);
  assertEquals(sent.webinar_id, "561");
  assertEquals(sent.lead_id, "818");
  assertEquals(out.success, true);
});

Deno.test("lead-unsubscribe: is marked idempotent — unsubscribing twice is a no-op state, not a duplicate", () => {
  assertEquals(leadUnsubscribe.idempotent, true);
  assertEquals(leadUnsubscribe.type, "perform");
});

Deno.test("lead-unsubscribe: an unknown lead surfaces the vendor's own error text", async () => {
  const { ctx } = mockWebinarJamCtx([{
    status: 401,
    body: failure({ lead_id: "lead not found" }),
  }]);
  await assertRejects(
    async () => {
      await leadUnsubscribe.execute({ product: "webinarjam", webinarId: 561, leadId: 999 }, ctx);
    },
    Error,
    "lead not found",
  );
});
