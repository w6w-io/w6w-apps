import { assertEquals } from "@std/assert";
import getGamma from "../../actions/get-gamma.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-gamma: calls GET /gammas/{id}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "g_1",
        title: "Q3 Update",
        type: "regular",
        url: "https://gamma.app/docs/x",
        thumbnailUrl: null,
        description: null,
        author: null,
        createdTime: null,
        updatedTime: null,
        themeId: null,
        archived: false,
      },
    },
  ]);
  const out = await getGamma.execute({ gammaId: "g_1" }, ctx) as { title: string };

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1");
  assertEquals(out.title, "Q3 Update");
});

Deno.test("get-gamma: accepts a doc-id-shaped id verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "g_1" } }]);
  await getGamma.execute({ gammaId: "bc7s74ruzod20f4" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/bc7s74ruzod20f4");
});
