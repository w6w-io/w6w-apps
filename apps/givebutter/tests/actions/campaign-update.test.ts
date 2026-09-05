import { assertEquals } from "@std/assert";
import campaignUpdate from "../../actions/campaign-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-update: PUTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "12345" }) }]);
  await campaignUpdate.execute({ id: "12345", published: true }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/campaigns/12345");
  assertEquals(JSON.parse(calls[0].body!), { published: true });
});
