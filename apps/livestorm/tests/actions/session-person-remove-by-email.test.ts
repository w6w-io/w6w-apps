import { assertEquals } from "@std/assert";
import sessionPersonRemoveByEmail from "../../actions/session-person-remove-by-email.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("session-person-remove-by-email: DELETEs /sessions/{id}/people?filter[email]=", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await sessionPersonRemoveByEmail.execute({ id: "s1", email: "a@b.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people");
  assertEquals(queryOf(calls[0].url), { "filter[email]": "a@b.com" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
