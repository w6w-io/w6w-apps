import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/party-list.ts";

Deno.test("party-list: GETs /parties with paging and since", async () => {
  const { ctx, calls } = mockCtx([{
    body: { parties: [{ id: 1 }] },
    headers: { link: '<https://api.capsulecrm.com/api/v2/parties?page=2>; rel="next"' },
  }]);
  const out = await action.execute({ page: 1, perPage: 50, since: "2020-01-01T00:00:00Z" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/parties");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("perPage"), "50");
  assertEquals(url.searchParams.get("since"), "2020-01-01T00:00:00Z");
  assertEquals(out, { parties: [{ id: 1 }], nextPage: 2 });
});

Deno.test("party-list: joins embed values with a comma", async () => {
  const { ctx, calls } = mockCtx([{ body: { parties: [] } }]);
  await action.execute({ embed: ["tags", "fields"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("embed"), "tags,fields");
});

Deno.test("party-list: no Link header means no next page", async () => {
  const { ctx } = mockCtx([{ body: { parties: [] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { parties: [], nextPage: undefined });
});
