import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/users-list.ts";

Deno.test("users-list: POSTs users.list with filter + page, returns items", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "u1" }] } }]);
  const out = await action.execute({ term: "John", status: ["active"], pageSize: 5 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users.list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter, { term: "John", status: ["active"] });
  assertEquals(body.page, { size: 5, number: 1 });
  assertEquals(out, { items: [{ id: "u1" }] });
});

Deno.test("users-list: returns an empty array when data is absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
