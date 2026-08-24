import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: calls GET /contacts.json with cursor ordering", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await contactList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts.json");
  assertEquals(queryOf(calls[0].url).order, "id(asc)");
});

Deno.test("contact-list: forwards type and client_only filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute({ type: "Company", clientOnly: true }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.type, "Company");
  assertEquals(q.client_only, "true");
});
