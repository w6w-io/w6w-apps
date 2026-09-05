import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-page.ts";

Deno.test("get-page: addresses /me/onenote/pages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", title: "Hello" } }]);
  const out = await action.execute({ pageId: "p1" }, ctx) as { title: string };
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages/p1");
  assertEquals(out.title, "Hello");
});
