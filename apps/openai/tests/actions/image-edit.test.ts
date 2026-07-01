import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/image-edit.ts";

// base64("hello")
const PNG_B64 = "aGVsbG8=";

Deno.test("image-edit: POSTs multipart to /images/edits with image + prompt", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ image: PNG_B64, prompt: "make it blue" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/images/edits");

  const form = calls[0].rawBody as FormData;
  assertEquals(form instanceof FormData, true);
  assertEquals(form.get("prompt"), "make it blue");
  assertEquals(form.get("model"), "dall-e-2");
  assertEquals(form.get("n"), "1");
  assertEquals(form.get("size"), "1024x1024");
  assertEquals(form.get("response_format"), "url");
  const image = form.get("image") as File;
  assertEquals(image instanceof File, true);
  assertEquals(image.name, "image.png");
  assertEquals(image.type, "image/png");
});

Deno.test("image-edit: includes mask + user when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      image: PNG_B64,
      prompt: "p",
      mask: PNG_B64,
      user: "u1",
      responseFormat: "b64_json",
      imageFileName: "in.png",
      maskFileName: "mk.png",
    },
    ctx,
  );
  const form = calls[0].rawBody as FormData;
  assertEquals((form.get("image") as File).name, "in.png");
  assertEquals((form.get("mask") as File).name, "mk.png");
  assertEquals(form.get("user"), "u1");
  assertEquals(form.get("response_format"), "b64_json");
});
