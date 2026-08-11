import { assert, assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { campaigns: [{ id: "1", name: "Spring" }], next_page_token: "n" };

Deno.test("campaign-list: reads the campaigns collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await campaignList.execute({}, ctx) as { count: number; nextPageToken?: string };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/campaigns");
  assertEquals(out.count, 1);
  assertEquals(out.nextPageToken, "n");
});

/** The `==` here is a *contains* match: "look for the text anywhere in the campaign name". */
Deno.test("campaign-list: the name clause is sent as an equality clause that means contains", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await campaignList.execute({ name: "Spring Campaign" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "name==Spring Campaign");
  assertEquals(campaignList.params?.find((p) => p.key === "name")?.label, "Name contains");
});

/**
 * These sort field names are the odd ones out across the whole API — lowercase
 * and unseparated where every other resource uses snake_case.
 */
Deno.test("campaign-list: the order-by hint carries Keap's unusual field spellings", () => {
  const hint = campaignList.params?.find((p) => p.key === "orderBy")?.hint ?? "";
  for (const field of ["publisheddate", "completedContactCount", "datecreated", "lastupdated"]) {
    assert(hint.includes(field), `${field} missing from the order-by hint`);
  }
});
