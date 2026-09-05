import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-item.ts";

Deno.test("get-item: GETs /v0/item/:id.json and returns the item", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        by: "dhouston",
        descendants: 71,
        id: 8863,
        kids: [8952, 9224],
        score: 111,
        time: 1175714200,
        title: "My YC app: Dropbox - Throw away your USB drive",
        type: "story",
        url: "http://www.getdropbox.com/u/2/screencast.html",
      },
    },
  ]);
  const out = await action.execute({ id: 8863 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/item/8863.json");
  assertEquals(out?.id, 8863);
  assertEquals(out?.type, "story");
  assertEquals(out?.title, "My YC app: Dropbox - Throw away your USB drive");
});

Deno.test("get-item: a missing id answers 200 null, passed through unchanged", async () => {
  const { ctx } = mockCtx([{ body: "null" }]);
  const out = await action.execute({ id: 999999999999 }, ctx);
  assertEquals(out, null);
});
