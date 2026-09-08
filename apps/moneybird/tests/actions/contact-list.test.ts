import { assertEquals } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { mockMoneybirdCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GETs the administration's contacts and unwraps the bare array", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: [{ id: "c1" }] }]);
  const out = await action.execute({ query: "appleseed" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v2/123/contacts.json");
  assertEquals(queryOf(calls[0].url), { query: "appleseed" });
  assertEquals(out.items, [{ id: "c1" }]);
});

Deno.test("contact-list: an explicit administrationId overrides the connection's default", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: [] }], { administrationId: "111" });
  await action.execute({ administrationId: "222" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/222/contacts.json");
});

Deno.test("contact-list: passes through pagination and includeArchived", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: [] }]);
  await action.execute({ page: 2, perPage: 10, includeArchived: true }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2", per_page: "10", include_archived: "true" });
});

Deno.test("contact-list: a null body is returned as an empty array", async () => {
  const { ctx } = mockMoneybirdCtx([{ status: 204 }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
