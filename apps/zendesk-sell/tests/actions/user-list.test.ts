import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: fetches /v2/users with filters mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 2, name: "Mark Johnson" }]) }]);
  const out = await userList.execute({ role: "user", status: "active", confirmed: true }, ctx) as {
    items: unknown[];
    count: number;
  };

  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(queryOf(calls[0].url), { role: "user", status: "active", confirmed: "true" });
  assertEquals(out.items, [{ id: 2, name: "Mark Johnson" }]);
});
