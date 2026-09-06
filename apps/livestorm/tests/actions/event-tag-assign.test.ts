import { assertEquals } from "@std/assert";
import eventTagAssign from "../../actions/event-tag-assign.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-tag-assign: POSTs a tags body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("tags", "t1", { title: "launch" }),
  }]);
  const result = await eventTagAssign.execute({ id: "e1", title: "launch" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "tags", attributes: { title: "launch" } },
  });
  assertEquals(result, { id: "t1", type: "tags", attributes: { title: "launch" } });
});
