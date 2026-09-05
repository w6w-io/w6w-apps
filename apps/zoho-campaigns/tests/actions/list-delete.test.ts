import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/list-delete.ts";

Deno.test("list-delete: GETs deletemailinglist with the list key and delete-contacts flag", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", message: "List(s) are deleted successfully!" } },
  ]);
  const out = await action.execute({ listKey: "abc", deleteContacts: "on" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/deletemailinglist");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("deletecontacts"), "on");
  assertEquals(out, { message: "List(s) are deleted successfully!" });
});
