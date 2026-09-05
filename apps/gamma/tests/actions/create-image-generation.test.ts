import { assertEquals } from "@std/assert";
import createImageGeneration from "../../actions/create-image-generation.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-image-generation: POSTs /images with the prompt", async () => {
  const { ctx, calls } = mockCtx([{ body: { imageGenerationId: "img1", warnings: [] } }]);
  const out = await createImageGeneration.execute({ prompt: "a fox on white" }, ctx) as {
    imageGenerationId: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/images");
  assertEquals(JSON.parse(calls[0].body!), { prompt: "a fox on white" });
  assertEquals(out.imageGenerationId, "img1");
});

Deno.test("create-image-generation: referenceImages pass through as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { imageGenerationId: "img1" } }]);
  const referenceImages = [{ url: "https://example.com/a.png", role: "subject" }];
  await createImageGeneration.execute({ prompt: "p", referenceImages }, ctx);
  assertEquals(JSON.parse(calls[0].body!).referenceImages, referenceImages);
});
