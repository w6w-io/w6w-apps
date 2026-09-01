import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts with no query params by default", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { contacts: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts");
  assertEquals(url.search, "");
});

Deno.test("contact-list: forwards view/sort/updated_since/page/per_page", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { contacts: [] } }]);
  await action.execute({
    view: "clients",
    sort: "updated_at",
    updatedSince: "2026-01-01T00:00:00Z",
    page: 2,
    perPage: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("view"), "clients");
  assertEquals(url.searchParams.get("sort"), "updated_at");
  assertEquals(url.searchParams.get("updated_since"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
});
