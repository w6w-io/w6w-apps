import { assert, assertEquals } from "@std/assert";
import clientDraftsGet from "../../actions/client-drafts-get.ts";
import clientCampaignsGet from "../../actions/client-campaigns-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-drafts-get: GETs /clients/{clientid}/drafts.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await clientDraftsGet.execute({ clientId: "cid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/drafts.json`);
});

/**
 * The asymmetry worth pinning: sent campaigns are paged, drafts are a bare
 * array. Same client, same noun, two response shapes.
 */
Deno.test("client-drafts-get: returns a bare array, unlike sent campaigns", async () => {
  const drafts = [{
    CampaignID: "7c7424792065d92627139208c8c01db1",
    Name: "Draft One",
    Subject: "Draft One",
    FromName: "My Name",
    FromEmail: "a@example.com",
    ReplyTo: "a@example.com",
    DateCreated: "2021-08-19 16:08:00",
    Tags: ["halloween"],
  }];
  const { ctx } = mockCtx([{ body: drafts }]);
  const out = await clientDraftsGet.execute({ clientId: "cid" }, ctx);
  assert(Array.isArray(out), "drafts must come back as a bare array");
  assertEquals(out, drafts);
  // And the sibling action declares the paged envelope instead.
  assert(
    (clientCampaignsGet.output as Array<{ key: string }>).some((f) => f.key === "NumberOfPages"),
    "sent campaigns must still declare the paged envelope",
  );
});
