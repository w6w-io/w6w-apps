import { assertEquals } from "@std/assert";
import clientCampaignsGet from "../../actions/client-campaigns-get.ts";
import { API_PATH, mockCtx, pagedBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-campaigns-get: GETs /clients/{clientid}/campaigns.json with every filter", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await clientCampaignsGet.execute({
    clientId: "cid",
    sentFromDate: "2026-01-01",
    sentToDate: "2026-12-31",
    tags: "2026,promo",
    page: 3,
    pageSize: 25,
    orderDirection: "asc",
  }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/campaigns.json`);
  assertEquals(queryOf(calls[0].url), {
    sentFromDate: "2026-01-01",
    sentToDate: "2026-12-31",
    tags: "2026,promo",
    page: "3",
    pagesize: "25",
    orderdirection: "asc",
  });
});

/**
 * Paginated as of v3.3 — this endpoint used to answer a bare array in 3.2, and
 * the envelope is the headline breaking change of the version bump.
 */
Deno.test("client-campaigns-get: returns the v3.3 paged envelope, not a bare array", async () => {
  const campaign = {
    CampaignID: "fc0ce7105baeaf97f47c99be31d02a91",
    Name: "Campaign One",
    Subject: "Campaign One",
    FromName: "My Name",
    FromEmail: "a@example.com",
    ReplyTo: "a@example.com",
    SentDate: "2020-10-12 12:58:00",
    TotalRecipients: 2245,
    Tags: ["2020", "COVID-19"],
  };
  const { ctx } = mockCtx([{ body: pagedBody([campaign]) }]);
  const out = await clientCampaignsGet.execute({ clientId: "cid" }, ctx);
  assertEquals(out.Results[0].Tags, ["2020", "COVID-19"]);
  assertEquals(out.PageNumber, 1);
});
