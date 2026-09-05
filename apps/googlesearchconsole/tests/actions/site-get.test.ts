import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/site-get.ts";

Deno.test("site-get: builds the path from the explicit siteUrl override", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { siteUrl: "https://www.example.com/", permissionLevel: "SITE_OWNER" } }],
    { display: { siteUrl: "https://other.example.com/" } },
  );
  await action.execute!({ siteUrl: "https://www.example.com/" }, ctx);
  assertEquals(
    calls[0].url,
    "https://searchconsole.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.example.com%2F",
  );
});

Deno.test("site-get: falls back to the connection's default site", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { siteUrl: "sc-domain:example.com" },
  });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(decodeURIComponent(url.pathname), "/webmasters/v3/sites/sc-domain:example.com");
});

Deno.test("site-get: no site anywhere is a clear error, not a bad request to Google", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no Search Console site");
  assertEquals(calls.length, 0);
});
