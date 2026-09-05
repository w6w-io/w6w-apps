import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("contact-list: GETs /contacts with page and limit", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { contacts: [{ id: 1 }] } } }],
    conn,
  );
  const out = await action.execute!({ page: 1, limit: 25 }, ctx);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/contacts?page=1&limit=25");
  assertEquals(out.contacts, [{ id: 1 }]);
});

Deno.test("contact-list: query and ids filter through", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { contacts: [] } } }],
    conn,
  );
  await action.execute!({ query: "jane", ids: "5,6" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "jane");
  assertEquals(url.searchParams.getAll("filter[id][]"), ["5", "6"]);
});

Deno.test("contact-list: type is search, and resource is contact", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "contact");
});
