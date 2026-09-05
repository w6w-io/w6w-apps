import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-best-stories.ts";

Deno.test("list-best-stories: GETs /v0/beststories.json and wraps the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [49554643, 49550772] }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/beststories.json");
  assertEquals(out.ids, [49554643, 49550772]);
});
