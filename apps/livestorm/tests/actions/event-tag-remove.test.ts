import { assertEquals } from "@std/assert";
import eventTagRemove from "../../actions/event-tag-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-tag-remove: DELETEs with a tags body, returns 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await eventTagRemove.execute({ id: "e1", title: "launch" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1/tags");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "tags", attributes: { title: "launch" } },
  });
  assertEquals(result, { status: 204 });
});
