import { assertEquals } from "@std/assert";
import campaignSummaryGet from "../../actions/campaign-summary-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

/** The vendor's published example, verbatim. */
const SUMMARY = {
  Name: "Warehouse sale",
  Recipients: 1000,
  TotalOpened: 345,
  Clicks: 132,
  Unsubscribed: 43,
  Bounced: 15,
  UniqueOpened: 298,
  SpamComplaints: 23,
  WebVersionURL: "https://createsend.com/t/y-A1A1A1A1A1A1A1A1A1A1A1A1/",
  WebVersionTextURL: "https://createsend.com/t/y-A1A1A1A1A1A1A1A1A1A1A1A1/t",
  WorldviewURL: "https://myclient.createsend.com/reports/wv/y/8WY898U9U98U9U9",
  Forwards: 18,
  Likes: 25,
  Mentions: 11,
};

Deno.test("campaign-summary-get: GETs /campaigns/{campaignid}/summary.json", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  const out = await campaignSummaryGet.execute({ campaignId: "cmp" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/summary.json`);
  assertEquals(out, SUMMARY);
});

/**
 * TotalOpened counts events, UniqueOpened counts people, and in the vendor's own
 * example they differ by 47. Both must survive so a caller can pick the right
 * one rather than reading opens as people.
 */
Deno.test("campaign-summary-get: keeps total and unique opens as separate numbers", async () => {
  const { ctx } = mockCtx([{ body: SUMMARY }]);
  const out = await campaignSummaryGet.execute({ campaignId: "cmp" }, ctx);
  assertEquals(out.TotalOpened, 345);
  assertEquals(out.UniqueOpened, 298);
});

/**
 * The three public URLs are returned as data. One request in the whole action is
 * what proves none of them is fetched — createsend.com's report hosts are
 * deliberately absent from network.allow.
 */
Deno.test("campaign-summary-get: returns the report URLs without fetching any of them", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  const out = await campaignSummaryGet.execute({ campaignId: "cmp" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.WorldviewURL, SUMMARY.WorldviewURL);
});
