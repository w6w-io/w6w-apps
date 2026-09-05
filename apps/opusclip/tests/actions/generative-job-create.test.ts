import { assertEquals } from "@std/assert";
import generativeJobCreate from "../../actions/generative-job-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("generative-job-create: always sends jobType=thumbnail, no envelope on the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { jobId: "thumb1" } }]);
  const out = await generativeJobCreate.execute({ sourceUri: "https://youtube.com/x" }, ctx) as {
    jobId: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/generative-jobs");
  assertEquals(JSON.parse(calls[0].body!), {
    jobType: "thumbnail",
    sourceUri: "https://youtube.com/x",
  });
  assertEquals(out.jobId, "thumb1");
});

Deno.test("generative-job-create: includes reference/mask/prompt only when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { jobId: "thumb2" } }]);
  await generativeJobCreate.execute({
    sourceUri: "https://youtube.com/x",
    referenceImageUri: "https://cdn/ref.png",
    maskImageUri: "https://cdn/mask.png",
    prompt: "bold text",
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    jobType: "thumbnail",
    sourceUri: "https://youtube.com/x",
    referenceImageUri: "https://cdn/ref.png",
    maskImageUri: "https://cdn/mask.png",
    prompt: "bold text",
  });
});

Deno.test("generative-job-create: is declared non-idempotent", () => {
  assertEquals(generativeJobCreate.idempotent, false);
});
