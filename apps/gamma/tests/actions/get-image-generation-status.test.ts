import { assertEquals } from "@std/assert";
import getImageGenerationStatus from "../../actions/get-image-generation-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-image-generation-status: calls GET /images/{id}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        imageGenerationId: "img1",
        status: "completed",
        image: {
          url: "https://cdn/x.png",
          width: 512,
          height: 512,
          format: "png",
          mimeType: "image/png",
          transparency: false,
          aspectRatioUsed: "1:1",
          savedMediaId: "media1",
        },
      },
    },
  ]);
  const out = await getImageGenerationStatus.execute({ imageGenerationId: "img1" }, ctx) as {
    image: { savedMediaId: string };
  };

  assertEquals(pathOf(calls[0].url), "/v1.0/images/img1");
  assertEquals(out.image.savedMediaId, "media1");
});
