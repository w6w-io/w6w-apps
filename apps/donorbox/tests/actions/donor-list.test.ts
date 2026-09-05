import { assertEquals } from "@std/assert";
import donorList from "../../actions/donor-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("donor-list: hits /api/v1/donors", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 35, email: "johndoe@email.com" }] }]);
  const out = await donorList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/donors");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("donor-list: passes the id and email filters through", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donorList.execute({ id: 35, email: "johndoe@email.com" }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.id, "35");
  assertEquals(query.email, "johndoe@email.com");
});

Deno.test("donor-list: an unset filter is omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donorList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).donor_name, undefined);
});
