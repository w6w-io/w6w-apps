import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-insert.ts";

Deno.test("group-insert: POSTs /groups with the given email/name/description", async () => {
  const body = { id: "g-1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    email: "team@example.com",
    name: "Team",
    description: "The team",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "team@example.com",
    name: "Team",
    description: "The team",
  });
  assertEquals(result, body);
});

Deno.test("group-insert: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
