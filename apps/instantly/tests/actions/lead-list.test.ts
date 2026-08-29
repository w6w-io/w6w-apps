import { assertEquals } from "@std/assert";
import leadList from "../../actions/lead-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-list: POSTs /leads/list with the filter body", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "l1" }] } }]);
  const out = await leadList.execute(
    { campaign: "c1", filter: "FILTER_VAL_CONTACTED", limit: 10 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads/list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign, "c1");
  assertEquals(body.filter, "FILTER_VAL_CONTACTED");
  assertEquals(body.limit, 10);
  assertEquals(out.items.length, 1);
});

Deno.test("lead-list: contacts/ids accept a comma string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await leadList.execute({ contacts: "a@b.com, c@d.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).contacts, ["a@b.com", "c@d.com"]);
});

Deno.test("lead-list: is a search action", () => {
  assertEquals(leadList.type, "search");
});
