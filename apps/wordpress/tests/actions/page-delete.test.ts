import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-delete.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("page-delete: DELETEs /pages/{id} without force by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ pageId: "5" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/pages/5");
  assert(!new URL(calls[0].url).searchParams.has("force"));
});

Deno.test("page-delete: forwards force=true when requested", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ pageId: "5", force: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("force"), "true");
});
