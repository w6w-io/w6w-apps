import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: GETs /v2/users/me and maps snake_case fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        iden: "u1",
        name: "Elon Musk",
        image_url: "https://x/y.png",
        max_upload_size: 26214400,
      },
    },
  ]);
  const out = await userGet.execute({}, ctx) as {
    iden: string;
    imageUrl: string;
    maxUploadSize: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(out.iden, "u1");
  assertEquals(out.imageUrl, "https://x/y.png");
  assertEquals(out.maxUploadSize, 26214400);
});

Deno.test("user-get: takes no params — safe to invoke with {}", () => {
  assertEquals(userGet.params, []);
});
