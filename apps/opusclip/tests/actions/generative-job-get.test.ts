import { assertEquals } from "@std/assert";
import generativeJobGet from "../../actions/generative-job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("generative-job-get: GETs the job and returns the concluded result verbatim", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { status: "CONCLUDED", result: { generatedThumbnailUris: ["https://cdn/a.png"] } },
    },
  ]);
  const out = await generativeJobGet.execute({ jobId: "thumb1" }, ctx) as {
    status: string;
    result: { generatedThumbnailUris: string[] };
  };

  assertEquals(pathOf(calls[0].url), "/api/generative-jobs/thumb1");
  assertEquals(out.status, "CONCLUDED");
  assertEquals(out.result.generatedThumbnailUris, ["https://cdn/a.png"]);
});
