import { assertEquals } from "@std/assert";
import sessionPersonRemove from "../../actions/session-person-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-person-remove: DELETEs /sessions/{id}/people/{peopleId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await sessionPersonRemove.execute({ id: "s1", peopleId: "p1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people/p1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
