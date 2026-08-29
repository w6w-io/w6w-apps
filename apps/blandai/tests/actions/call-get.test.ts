import { assertEquals } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-get: fetches by id and maps the full response, including the transcript", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      call_id: "c-1",
      status: "completed",
      completed: true,
      call_length: 0.75,
      to: "+1",
      from: "+2",
      answered_by: "human",
      summary: "A short summary.",
      concatenated_transcript: "user: hi\nassistant: hello",
      transcripts: [{ id: 1, text: "hi", user: "user" }],
      recording_url: null,
      analysis: null,
      variables: { city: "SF" },
      price: 0.07,
      error_message: null,
    },
  }]);
  const out = await callGet.execute({ callId: "c-1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v1/calls/c-1");
  assertEquals(out.callId, "c-1");
  assertEquals(out.status, "completed");
  assertEquals(out.answeredBy, "human");
  assertEquals(out.transcripts, [{ id: 1, text: "hi", user: "user" }]);
  assertEquals(out.concatenatedTranscript, "user: hi\nassistant: hello");
  assertEquals(out.price, 0.07);
});

Deno.test("call-get: URL-encodes the call id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await callGet.execute({ callId: "weird id/with slash" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/calls/weird%20id%2Fwith%20slash");
});

Deno.test("call-get: defaults transcripts to an empty array when absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { call_id: "c-1" } }]);
  const out = await callGet.execute({ callId: "c-1" }, ctx) as Record<string, unknown>;
  assertEquals(out.transcripts, []);
});
