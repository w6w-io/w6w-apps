import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/site-add.ts";

Deno.test("site-add: PUTs the site path with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute!({ siteUrl: "sc-domain:example.com" }, ctx) as {
    siteUrl: string;
  };
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out.siteUrl, "sc-domain:example.com");
});

Deno.test("site-add: siteUrl is required and never falls back to the connection", async () => {
  const { ctx, calls } = mockCtx([], { display: { siteUrl: "https://existing.example.com/" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`siteUrl`");
  assertEquals(calls.length, 0);
});
