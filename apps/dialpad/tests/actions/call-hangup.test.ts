import { assertEquals } from "@std/assert";
import callHangup from "../../actions/call-hangup.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-hangup: PUTs /call/{id}/actions/hangup", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await callHangup.execute({ callId: "5" }, ctx) as { status: number };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/call/5/actions/hangup");
  assertEquals(out.status, 200);
});

Deno.test("call-hangup: declared non-idempotent", () => {
  assertEquals(callHangup.idempotent, false);
});
