import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-job-stories.ts";

Deno.test("list-job-stories: GETs /v0/jobstories.json and wraps the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [49563415, 49556922] }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/jobstories.json");
  assertEquals(out.ids, [49563415, 49556922]);
});
