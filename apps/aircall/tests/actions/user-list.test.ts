import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * v2, not v1. Every v1 User page carries "User V1 API will be deprecated soon.
 * Please migrate to User V2 API", so this pin is the point of the test.
 */
Deno.test("user-list: reads the v2 surface, not the deprecated v1 one", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("users", [{ id: 456 }]) }]);
  const out = await userList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(out.items.length, 1);
});

Deno.test("user-list: window and pagination reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("users", []) }]);
  await userList.execute({ from: "1", to: "2", order: "desc", page: 2, perPage: 50 }, ctx);
  assertEquals(queryOf(calls[0].url), {
    from: "1",
    to: "2",
    order: "desc",
    page: "2",
    per_page: "50",
  });
});
