import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-contacts: GETs /contacts with mapped filters and pagination", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contacts: [] } }]);
  await action.execute({
    name: "Kevin",
    contactType: "Client",
    active: true,
    tags: ["vip", "referral"],
    order: "recent",
    page: 2,
    perPage: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/contacts");
  assertEquals(url.searchParams.get("name"), "Kevin");
  assertEquals(url.searchParams.get("contact_type"), "Client");
  assertEquals(url.searchParams.get("active"), "true");
  assertEquals(url.searchParams.getAll("tags[]"), ["vip", "referral"]);
  assertEquals(url.searchParams.get("order"), "recent");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
});

Deno.test("list-contacts: omits filters the caller did not supply", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contacts: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals([...url.searchParams.keys()].length, 0);
});

Deno.test("list-contacts: returns the parsed response", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { contacts: [{ id: 1 }] } }]);
  const result = await action.execute({}, ctx) as { contacts: unknown[] };
  assertEquals(result.contacts.length, 1);
});
