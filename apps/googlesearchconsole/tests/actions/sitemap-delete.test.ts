import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sitemap-delete.ts";

Deno.test("sitemap-delete: DELETEs the nested sitemap path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], {
    display: { siteUrl: "sc-domain:example.com" },
  });
  await action.execute!({ feedpath: "https://example.com/sitemap.xml" }, ctx);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("sitemap-delete: feedpath is required", async () => {
  const { ctx, calls } = mockCtx([], { display: { siteUrl: "sc-domain:example.com" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`feedpath`");
  assertEquals(calls.length, 0);
});
