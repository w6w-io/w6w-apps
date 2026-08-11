import { assertEquals } from "@std/assert";
import downtimeCancel from "../../actions/downtime-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const UUID = "00000000-0000-1234-0000-000000000000";

Deno.test("downtime-cancel: DELETEs /api/v2/downtime/{uuid} and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await downtimeCancel.execute({ downtimeId: UUID }, ctx) as {
    downtimeId: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `/api/v2/downtime/${UUID}`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { downtimeId: UUID, status: 204 });
});

/**
 * The un-mute step. Cancelling an already-cancelled downtime changes nothing —
 * Datadog retains it for about two days — so this is genuinely safe to retry,
 * and saying so is what lets the runtime recover a dropped connection instead of
 * leaving production silenced.
 */
Deno.test("downtime-cancel: it is an idempotent perform", () => {
  assertEquals(downtimeCancel.type, "perform");
  assertEquals(downtimeCancel.idempotent, true);
});

Deno.test("downtime-cancel: a pasted id cannot change the request path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await downtimeCancel.execute({ downtimeId: "../monitor" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/downtime/..%2Fmonitor");
});
