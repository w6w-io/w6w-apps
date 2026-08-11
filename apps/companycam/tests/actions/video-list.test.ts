import { assert, assertEquals } from "@std/assert";
import videoList from "../../actions/video-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("video-list: sends the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await videoList.execute({ projectId: "1", userId: "9", startDate: "1637770053" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/videos");
  assertEquals(queryOf(calls[0].url), {
    project_ids: "1",
    user_ids: "9",
    start_date: "1637770053",
  });
});

Deno.test("video-list: offers no cursor params, which this endpoint never declared", () => {
  const keys = videoList.params!.map((p) => p.key);
  assert(!keys.includes("after") && !keys.includes("before"));
});
