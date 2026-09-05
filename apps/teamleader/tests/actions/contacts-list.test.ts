import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-list.ts";

Deno.test("contacts-list: POSTs contacts.list with filter + page, returns items and matches", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "1" }], meta: { page: { size: 20, number: 1 }, matches: 1 } },
  }]);
  const out = await action.execute({ term: "James", status: "active", pageSize: 10 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts.list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter, { term: "James", status: "active" });
  assertEquals(body.page, { size: 10, number: 1 });
  assertEquals(out, { items: [{ id: "1" }], matches: 1 });
});

Deno.test("contacts-list: omits filter and page entirely when nothing was provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({}, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("filter" in body, false);
  assertEquals("page" in body, false);
});

Deno.test("contacts-list: returns an empty array (not undefined) when data is absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
