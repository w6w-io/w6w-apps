import { assertEquals } from "@std/assert";
import action from "../../actions/response-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-list: lists canned responses", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: [{ id: "r1" }] } }]);
  const out = await action.execute({ organization: "org-1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/responses");
  assertEquals(out, [{ id: "r1" }]);
});
