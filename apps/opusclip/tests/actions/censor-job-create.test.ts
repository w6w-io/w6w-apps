import { assertEquals } from "@std/assert";
import censorJobCreate from "../../actions/censor-job-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("censor-job-create: POSTs projectId/clipId with no envelope on the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { jobId: "j1", message: "queued" } }]);
  const out = await censorJobCreate.execute({ projectId: "P1", clipId: "C1" }, ctx) as {
    jobId: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/censor-jobs");
  assertEquals(JSON.parse(calls[0].body!), { projectId: "P1", clipId: "C1" });
  assertEquals(out.jobId, "j1");
});

Deno.test("censor-job-create: nests beepSound under options only when provided", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { jobId: "j1" } },
    { status: 201, body: { jobId: "j2" } },
  ]);
  await censorJobCreate.execute({ projectId: "P1", clipId: "C1", beepSound: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).options, { beepSound: true });

  await censorJobCreate.execute({ projectId: "P1", clipId: "C1" }, ctx);
  assertEquals("options" in JSON.parse(calls[1].body!), false);
});

Deno.test("censor-job-create: is declared non-idempotent", () => {
  assertEquals(censorJobCreate.idempotent, false);
});
