import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/users-list.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("users-list: GETs /v2/users and forwards filters with LearnWorlds' own param names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: {} } }], conn);
  await action.execute!(
    {
      status: "paying",
      role: "user",
      tags: "vip,new",
      includeSuspended: true,
      page: 1,
      itemsPerPage: 50,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/api/v2/users");
  assertEquals(url.searchParams.get("status"), "paying");
  assertEquals(url.searchParams.get("role"), "user");
  assertEquals(url.searchParams.get("tags"), "vip,new");
  assertEquals(url.searchParams.get("include_suspended"), "true");
  assertEquals(url.searchParams.get("items_per_page"), "50");
});

Deno.test("users-list: omits include_suspended when false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: {} } }], conn);
  await action.execute!({ includeSuspended: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include_suspended"), null);
});
