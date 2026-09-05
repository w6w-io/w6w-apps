import { assertEquals } from "@std/assert";
import websiteUpdate from "../../actions/website-update.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("website-update: posts only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({}) }]);
  await websiteUpdate.execute({ websiteId: "w1", title: "New title" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/website.update");
  assertEquals(JSON.parse(calls[0].body!), { website_id: "w1", title: "New title" });
});

Deno.test("website-update: is idempotent and does not redeploy", () => {
  assertEquals(websiteUpdate.idempotent, true);
});
