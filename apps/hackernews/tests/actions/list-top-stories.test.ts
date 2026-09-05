import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-top-stories.ts";

Deno.test("list-top-stories: GETs /v0/topstories.json and wraps the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [9129911, 9129199, 9127761] }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/topstories.json");
  assertEquals(out.ids, [9129911, 9129199, 9127761]);
});
