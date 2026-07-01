import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/image-generate.ts";

Deno.test("image-generate: applies defaults (dall-e-3, n=1, 1024x1024, url)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ prompt: "a cat" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/images/generations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.prompt, "a cat");
  assertEquals(body.model, "dall-e-3");
  assertEquals(body.n, 1);
  assertEquals(body.size, "1024x1024");
  assertEquals(body.response_format, "url");
});

Deno.test("image-generate: forwards optional dall-e-3 fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      prompt: "a cat",
      model: "dall-e-3",
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "vivid",
      responseFormat: "b64_json",
      user: "u1",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.quality, "hd");
  assertEquals(body.style, "vivid");
  assertEquals(body.size, "1792x1024");
  assertEquals(body.response_format, "b64_json");
  assertEquals(body.user, "u1");
});
