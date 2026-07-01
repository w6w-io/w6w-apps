import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-profile.ts";

Deno.test("update-profile: PATCHes /profiles/{id}/ with the id echoed inside data", async () => {
  const body = { data: { type: "profile", id: "p1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ profileId: "p1", firstName: "Alice" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/profiles/p1/");
  assertEquals(calls[0].method, "PATCH");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "profile");
  assertEquals(sent.data.id, "p1");
  assertEquals(sent.data.attributes.first_name, "Alice");
});
