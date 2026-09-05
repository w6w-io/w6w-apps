import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sitemap-submit.ts";

Deno.test("sitemap-submit: PUTs with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], {
    display: { siteUrl: "sc-domain:example.com" },
  });
  await action.execute!({ feedpath: "https://example.com/sitemap.xml" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, null);
});

Deno.test("sitemap-submit: feedpath is required", async () => {
  const { ctx, calls } = mockCtx([], { display: { siteUrl: "sc-domain:example.com" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`feedpath`");
  assertEquals(calls.length, 0);
});
