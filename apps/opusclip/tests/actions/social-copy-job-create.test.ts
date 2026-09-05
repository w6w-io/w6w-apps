import { assertEquals } from "@std/assert";
import socialCopyJobCreate from "../../actions/social-copy-job-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("social-copy-job-create: POSTs the required fields and optional ones when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ jobId: "j1" }) }]);
  const out = await socialCopyJobCreate.execute({
    projectId: "P1",
    clipId: "C1",
    postAccountId: "pa1",
    subAccountId: "sa1",
    prompt: "playful",
    forceRegenerate: true,
  }, ctx) as { jobId: string };

  assertEquals(pathOf(calls[0].url), "/api/social-copy-jobs");
  assertEquals(JSON.parse(calls[0].body!), {
    projectId: "P1",
    clipId: "C1",
    postAccountId: "pa1",
    subAccountId: "sa1",
    prompt: "playful",
    forceRegenerate: true,
  });
  assertEquals(out.jobId, "j1");
});

Deno.test("social-copy-job-create: omits optional fields entirely when absent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ jobId: "j2" }) }]);
  await socialCopyJobCreate.execute(
    { projectId: "P1", clipId: "C1", postAccountId: "pa1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    projectId: "P1",
    clipId: "C1",
    postAccountId: "pa1",
  });
});
