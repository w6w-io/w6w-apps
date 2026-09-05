import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

Deno.test("list-create: POSTs addlistandcontacts with mode=newlist fixed and every field as a query param", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", listkey: "abc", listname: "My List" } },
  ]);
  const out = await action.execute(
    { listName: "My List", signupForm: "public", listDescription: "desc", emailIds: "a@b.com" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/addlistandcontacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(url.searchParams.get("mode"), "newlist");
  assertEquals(url.searchParams.get("listname"), "My List");
  assertEquals(url.searchParams.get("signupform"), "public");
  assertEquals(url.searchParams.get("listdescription"), "desc");
  assertEquals(url.searchParams.get("emailids"), "a@b.com");
  assertEquals(out, { listKey: "abc", listName: "My List" });
});
