import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/list-list.ts";

Deno.test("list-list: GETs getmailinglists and returns list_of_details as lists", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        status: "success",
        code: "0",
        list_of_details: [{ listkey: "abc", listname: "My List" }],
      },
    },
  ]);
  const out = await action.execute({ sort: "asc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/getmailinglists");
  assertEquals(url.searchParams.get("sort"), "asc");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { lists: [{ listkey: "abc", listname: "My List" }] });
});

Deno.test("list-list: returns an empty array when the vendor omits list_of_details", async () => {
  const { ctx } = mockCampaignsCtx([{ body: { status: "success", code: "0" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { lists: [] });
});
