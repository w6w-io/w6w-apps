import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-contacts.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-contacts: GETs /lists/{id}/contacts with no filters by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ listId: "l1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/lists/l1/contacts");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-contacts: sends the dotted date filters under their literal API names", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({
    listId: "l1",
    tag: "vip",
    status: "subscribed",
    createdAtGte: "2026-01-01T00:00:00Z",
    createdAtLte: "2026-02-01T00:00:00Z",
    lastUpdatedAtGte: "2026-03-01T00:00:00Z",
    lastUpdatedAtLte: "2026-04-01T00:00:00Z",
    limit: 50,
    startingAfter: "cursor",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("tag"), "vip");
  assertEquals(p.get("status"), "subscribed");
  assertEquals(p.get("created_at.gte"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("created_at.lte"), "2026-02-01T00:00:00Z");
  assertEquals(p.get("last_updated_at.gte"), "2026-03-01T00:00:00Z");
  assertEquals(p.get("last_updated_at.lte"), "2026-04-01T00:00:00Z");
  assertEquals(p.get("limit"), "50");
  assertEquals(p.get("starting_after"), "cursor");
});

Deno.test("list-contacts: omits every filter the caller left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ listId: "l1", status: "unsubscribed" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals([...p.keys()], ["status"]);
  assert(!p.has("created_at.gte"));
});

Deno.test("list-contacts: returns the page verbatim, cursor envelope included", async () => {
  const body = {
    data: [{ id: "c1", email_address: "otto@example.com", tags: ["vip"] }],
    paging: { next: { starting_after: "abc" } },
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ listId: "l1" }, ctx), body);
});
