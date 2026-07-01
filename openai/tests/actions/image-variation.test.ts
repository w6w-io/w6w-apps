import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/image-variation.ts";

const PNG_B64 = "aGVsbG8=";

Deno.test("image-variation: POSTs multipart to /images/variations with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ image: PNG_B64 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/images/variations");
  const form = calls[0].rawBody as FormData;
  assertEquals(form instanceof FormData, true);
  assertEquals(form.get("model"), "dall-e-2");
  assertEquals(form.get("n"), "1");
  assertEquals(form.get("size"), "1024x1024");
  assertEquals(form.get("response_format"), "url");
  assertEquals((form.get("image") as File).name, "image.png");
});
