import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts with orgId header and filters", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ include: "accounts", sortBy: "-lastName" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/contacts");
  assertEquals(calls[0].headers.orgid, "2389290");
  assertEquals(url.searchParams.get("include"), "accounts");
  assertEquals(url.searchParams.get("sortBy"), "-lastName");
  assertEquals(out.data, [{ id: "1" }]);
});
