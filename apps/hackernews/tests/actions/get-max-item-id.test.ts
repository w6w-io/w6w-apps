import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-max-item-id.ts";

Deno.test("get-max-item-id: GETs /v0/maxitem.json and wraps the bare number", async () => {
  const { ctx, calls } = mockCtx([{ body: 9130260 }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/maxitem.json");
  assertEquals(out.id, 9130260);
});
