import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: GETs /crm/v3/objects/contacts with paging cursor", async () => {
  const { ctx, calls } = mockCtx([
    { body: { results: [{ id: "1" }], paging: { next: { after: "cursor2" } } } },
  ]);
  const out = await action.execute!({ limit: 25, after: "cursor1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v3/objects/contacts");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("after"), "cursor1");
  const body = out as { results: unknown[]; paging: { next: { after: string } } };
  assertEquals(body.results.length, 1);
  assertEquals(body.paging.next.after, "cursor2");
});
