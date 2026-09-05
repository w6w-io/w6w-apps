import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/comment-get-many.ts";

Deno.test("comment-get-many: GETs comments with pagination defaults", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ issueIdOrKey: "HD-1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/comment?start=0&limit=50",
  );
});

Deno.test("comment-get-many: forwards public/internal filters", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ issueIdOrKey: "HD-1", public: true, internal: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("public"), "true");
  assertEquals(url.searchParams.get("internal"), "false");
});
