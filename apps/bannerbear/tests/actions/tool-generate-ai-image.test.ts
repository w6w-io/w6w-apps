import { assertEquals } from "@std/assert";
import toolGenerateAiImage from "../../actions/tool-generate-ai-image.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-generate-ai-image: POST /tools/generate_ai_image", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "generate_ai_image" } }]);
  await toolGenerateAiImage.execute(
    { prompt: "a red bicycle", model: "flux_1_1_pro", aspectRatio: "16:9" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/generate_ai_image");
  assertEquals(JSON.parse(calls[0].body!), {
    prompt: "a red bicycle",
    model: "flux_1_1_pro",
    aspect_ratio: "16:9",
  });
});

Deno.test("tool-generate-ai-image: requires a prompt", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolGenerateAiImage.execute({ prompt: "" }, ctx));
});
