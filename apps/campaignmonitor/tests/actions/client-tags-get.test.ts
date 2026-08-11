import { assertEquals } from "@std/assert";
import clientTagsGet from "../../actions/client-tags-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-tags-get: GETs /clients/{clientid}/tags.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await clientTagsGet.execute({ clientId: "cid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/tags.json`);
});

/**
 * The vendor's own example prints NumberOfCampaigns as a quoted string. The
 * output declaration says `string` for that reason; this pins the pass-through
 * so nobody "fixes" it into a number the API does not send.
 */
Deno.test("client-tags-get: the campaign count is passed through as the vendor sends it", async () => {
  const { ctx } = mockCtx([{ body: [{ Name: "Monthly promo", NumberOfCampaigns: "120" }] }]);
  const out = await clientTagsGet.execute({ clientId: "cid" }, ctx);
  assertEquals(out[0].NumberOfCampaigns, "120");
  const declared = (clientTagsGet.output as Array<{ key: string; type: string }>)
    .find((f) => f.key === "NumberOfCampaigns");
  assertEquals(
    declared?.type,
    "string",
    "the vendor's own example quotes this value; declaring it a number would lie",
  );
});
