import { assertEquals } from "@std/assert";
import socialCopyJobGet from "../../actions/social-copy-job-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("social-copy-job-get: GETs the job and unwraps its data", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: envelope({ jobId: "j1", status: "COMPLETED", title: "Hi" }) },
  ]);
  const out = await socialCopyJobGet.execute({ jobId: "j1" }, ctx) as {
    status: string;
    title: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/social-copy-jobs/j1");
  assertEquals(out.status, "COMPLETED");
  assertEquals(out.title, "Hi");
});
