import { assertEquals, assertRejects } from "@std/assert";
import transcriptSubmitAndWait from "../../actions/transcript-submit-and-wait.ts";
import { hostOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-submit-and-wait: submits then polls to completed", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "t1", status: "queued" } }, // POST /transcript
    { status: 200, body: { id: "t1", status: "processing" } }, // poll 1
    { status: 200, body: { id: "t1", status: "completed", text: "hello world" } }, // poll 2
  ]);
  const out = await transcriptSubmitAndWait.execute(
    { audioUrl: "https://x/a.mp3", pollIntervalSeconds: 0 },
    ctx,
  ) as { status: string; text: string };

  assertEquals(calls.length, 3);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/transcript");
  assertEquals(pathOf(calls[1].url), "/v2/transcript/t1");
  assertEquals(hostOf(calls[1].url), "api.assemblyai.com");
  assertEquals(out.status, "completed");
  assertEquals(out.text, "hello world");
});

Deno.test("transcript-submit-and-wait: returns immediately when already terminal on submit", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "t1", status: "completed", text: "fast" } },
  ]);
  const out = await transcriptSubmitAndWait.execute(
    { audioUrl: "https://x/a.mp3", pollIntervalSeconds: 0 },
    ctx,
  ) as { text: string };
  assertEquals(calls.length, 1);
  assertEquals(out.text, "fast");
});

Deno.test("transcript-submit-and-wait: throws on a terminal error status, with the vendor's error", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { id: "t1", status: "processing" } },
    {
      status: 200,
      body: { id: "t1", status: "error", error: "Download error, unable to download" },
    },
  ]);
  await assertRejects(
    async () =>
      await transcriptSubmitAndWait.execute(
        { audioUrl: "https://x/bad.mp3", pollIntervalSeconds: 0 },
        ctx,
      ),
    Error,
    "Download error, unable to download",
  );
});

Deno.test("transcript-submit-and-wait: throws a timeout error once the deadline passes", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { id: "t1", status: "processing" } }, // POST /transcript
    { status: 200, body: { id: "t1", status: "processing" } }, // one poll, still not terminal
  ]);
  // A tiny poll interval that outlasts a tinier timeout guarantees the deadline check
  // after the first poll fires the timeout, without a real multi-second test.
  await assertRejects(
    async () =>
      await transcriptSubmitAndWait.execute(
        { audioUrl: "https://x/a.mp3", pollIntervalSeconds: 0.05, timeoutSeconds: 0.01 },
        ctx,
      ),
    Error,
    "did not reach a terminal status",
  );
});

Deno.test("transcript-submit-and-wait: is declared non-idempotent, a perform action", () => {
  assertEquals(transcriptSubmitAndWait.idempotent, false);
  assertEquals(transcriptSubmitAndWait.type, "perform");
});
