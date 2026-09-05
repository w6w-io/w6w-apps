import { assertEquals } from "@std/assert";
import censorJobGet from "../../actions/censor-job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("censor-job-get: GETs /api/censor-jobs/{jobId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "PROCESSING" } }]);
  const out = await censorJobGet.execute({ jobId: "j1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/api/censor-jobs/j1");
  assertEquals(out.status, "PROCESSING");
});
