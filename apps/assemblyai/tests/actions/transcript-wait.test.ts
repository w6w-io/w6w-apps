import { assertEquals, assertRejects } from "@std/assert";
import transcriptWait from "../../actions/transcript-wait.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-wait: polls until completed, then returns the transcript", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "t1", status: "queued" } },
    { status: 200, body: { id: "t1", status: "processing" } },
    { status: 200, body: { id: "t1", status: "completed", text: "done" } },
  ]);
  const out = await transcriptWait.execute(
    { transcriptId: "t1", pollIntervalSeconds: 0 },
    ctx,
  ) as { status: string; text: string };
  assertEquals(calls.length, 3);
  assertEquals(calls.every((c) => pathOf(c.url) === "/v2/transcript/t1"), true);
  assertEquals(out.status, "completed");
  assertEquals(out.text, "done");
});

Deno.test("transcript-wait: returns an error-status transcript rather than throwing", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { id: "t1", status: "error", error: "Download error" } },
  ]);
  const out = await transcriptWait.execute(
    { transcriptId: "t1", pollIntervalSeconds: 0 },
    ctx,
  ) as { status: string; error: string };
  assertEquals(out.status, "error");
  assertEquals(out.error, "Download error");
});

Deno.test("transcript-wait: throws once the poll budget runs out", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { id: "t1", status: "processing" } },
    { status: 200, body: { id: "t1", status: "processing" } },
  ]);
  await assertRejects(
    async () =>
      await transcriptWait.execute(
        { transcriptId: "t1", pollIntervalSeconds: 0.05, timeoutSeconds: 0.01 },
        ctx,
      ),
    Error,
    "did not reach a terminal status",
  );
});

Deno.test("transcript-wait: is a read action", () => {
  assertEquals(transcriptWait.type, "read");
});
