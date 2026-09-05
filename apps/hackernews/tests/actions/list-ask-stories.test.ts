import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-ask-stories.ts";

Deno.test("list-ask-stories: GETs /v0/askstories.json and wraps the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [49533840, 49548600] }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/askstories.json");
  assertEquals(out.ids, [49533840, 49548600]);
});
