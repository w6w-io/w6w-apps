import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: fetches /campaigns/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "12345", title: "Annual Gala" }) }]);
  const out = await campaignGet.execute({ id: "12345" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/campaigns/12345");
  assertEquals(out, { id: "12345", title: "Annual Gala" });
});
