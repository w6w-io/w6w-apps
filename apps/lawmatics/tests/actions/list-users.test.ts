import { assertEquals } from "@std/assert";
import listUsers from "../../actions/list-users.ts";
import { item, list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-users: hits GET /v1/users and takes no params", async () => {
  const { ctx, calls } = mockCtx([{
    body: list([item("17", "user", { name: "Roey Chasman", email: "roey@lawmatics.com" })]),
  }]);
  const out = await listUsers.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.data.length, 1);
  assertEquals(listUsers.params?.length, 0);
});
