import { assertEquals } from "@std/assert";
import recordingGet from "../../actions/recording-get.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("recording-get downloads bytes and returns them base64-encoded", async () => {
  const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04]); // fake MP3-ish header
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: bytes,
    headers: { "content-type": "audio/mpeg" },
  }]);
  const out = await recordingGet.execute({ leadId: 13451345 }, ctx);
  assertEquals(out.contentType, "audio/mpeg");
  assertEquals(out.encoding, "base64");
  const decoded = Uint8Array.from(atob(out.content), (c) => c.charCodeAt(0));
  assertEquals(Array.from(decoded), Array.from(bytes));
  assertEquals(calls[0].url, `${API_ROOT}/recording?lead_id=13451345`);
  assertEquals(queryOf(calls[0].url), { lead_id: "13451345" });
});
