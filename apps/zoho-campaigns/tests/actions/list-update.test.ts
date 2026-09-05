import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/list-update.ts";

Deno.test("list-update: POSTs updatelistdetails with the new name and signup form", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", message: "List updated successfully." } },
  ]);
  const out = await action.execute(
    { listKey: "abc", newListName: "New Name", signupForm: "private" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/updatelistdetails");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("newlistname"), "New Name");
  assertEquals(url.searchParams.get("signupform"), "private");
  assertEquals(out, { message: "List updated successfully." });
});
