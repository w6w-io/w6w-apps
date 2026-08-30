import { assertEquals } from "@std/assert";
import callRecordingsGet from "../../actions/call-recordings-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-recordings-get: GETs /v1/call-recordings/{callId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "rec1" }] } }]);
  const out = await callRecordingsGet.execute({ callId: "call1" }, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/call-recordings/call1");
  assertEquals(out.data.length, 1);
});

Deno.test("call-recordings-get: is a read action (fixed, non-paginated list)", () => {
  assertEquals(callRecordingsGet.type, "read");
});
