import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getWebsite from "../../actions/get-website.ts";

Deno.test("get-website: fetches GET /website/{website_id} and returns data", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, reason: "resolved", data: { website_id: "site_1", name: "Acme" } } },
  ], "site_1");
  const result = await getWebsite.execute({}, ctx);
  assertEquals(result, { website_id: "site_1", name: "Acme" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-website: declares no params — nothing to configure beyond the Connection", () => {
  assertEquals(getWebsite.params, []);
  assertEquals(getWebsite.type, "read");
});
