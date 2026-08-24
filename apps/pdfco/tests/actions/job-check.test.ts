import { assertEquals, assertRejects } from "@std/assert";
import jobCheck from "../../actions/job-check.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-check: posts jobid (lowercase) to /v1/job/check", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", url: "https://x/out.pdf" } }]);
  const out = await jobCheck.execute({ jobid: "ABC123" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/job/check");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.jobid, "ABC123");
  assertEquals("jobId" in sent, false, "request field is lowercase jobid, not camelCase jobId");
  assertEquals(out.status, "success");
});

Deno.test("job-check: a jobid unknown to this API key surfaces PDF.co's 404", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { errorCode: 404, error: true, message: "Job not found" } },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(jobCheck.execute({ jobid: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Job not found"), true, err.message);
});
