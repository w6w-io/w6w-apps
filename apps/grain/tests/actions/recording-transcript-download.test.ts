import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-transcript-download.ts";

Deno.test("recording-transcript-download: GETs the .txt path by default", async () => {
  const { ctx, calls } = mockCtx([{
    body: "Obi Wan Kenobi: Hello there.",
    headers: { "content-type": "text/plain" },
  }]);
  const result = await action.execute({ recordingId: "r1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/_/public-api/v2/recordings/r1/transcript.txt",
  );
  assertEquals(result, { content: "Obi Wan Kenobi: Hello there.", format: "txt" });
});

Deno.test("recording-transcript-download: honors vtt and srt formats", async () => {
  for (const format of ["vtt", "srt"] as const) {
    const { ctx, calls } = mockCtx([{ body: "WEBVTT", headers: { "content-type": "text/plain" } }]);
    await action.execute({ recordingId: "r1", format }, ctx);
    assertEquals(
      new URL(calls[0].url).pathname,
      `/_/public-api/v2/recordings/r1/transcript.${format}`,
    );
  }
});

Deno.test("recording-transcript-download: falls back to txt for an unrecognized format", async () => {
  const { ctx, calls } = mockCtx([{ body: "x", headers: { "content-type": "text/plain" } }]);
  await action.execute({ recordingId: "r1", format: "docx" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/_/public-api/v2/recordings/r1/transcript.txt",
  );
});

Deno.test("recording-transcript-download: throws with status and body on failure", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "not found",
    headers: { "content-type": "text/plain" },
  }]);
  await assertRejects(
    async () => await action.execute({ recordingId: "missing" }, ctx),
    Error,
    "404",
  );
});

Deno.test("recording-transcript-download: is a read action defaulting to txt", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.find((p) => p.key === "format")?.default, "txt");
});
