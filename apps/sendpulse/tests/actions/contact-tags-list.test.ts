import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-tags-list.ts";

Deno.test("contact-tags-list: hits GET /crm/v1/contact-tags with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/contact-tags");
});

Deno.test("contact-tags-list: forwards a search filter as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ search: "vip" }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/contact-tags?search=vip");
});
