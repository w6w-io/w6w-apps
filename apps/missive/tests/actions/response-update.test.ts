import { assertEquals } from "@std/assert";
import action from "../../actions/response-update.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-update: patches by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: [{ id: "r1", title: "New" }] } }]);
  const out = await action.execute({ id: "r1", title: "New" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/responses/r1");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.responses, [{ id: "r1", title: "New" }]);
  assertEquals(out, { id: "r1", title: "New" });
});

Deno.test("response-update: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
