import { assertEquals, assertRejects } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const BASE = {
  clientId: "cid",
  name: "My Campaign",
  subject: "My Subject",
  fromName: "My Name",
  fromEmail: "a@example.com",
  replyTo: "a@example.com",
  htmlUrl: "https://example.com/campaign.html",
};

/** The path id is the CLIENT, and the response is a bare JSON string. */
Deno.test("campaign-create: POSTs to /campaigns/{clientid}.json and wraps the string id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: JSON.stringify("a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1"),
  }]);
  const out = await campaignCreate.execute({ ...BASE, listIds: ["l1"] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cid.json`);
  assertEquals(out, { CampaignID: "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" });
});

/**
 * "If you are using the SegmentIDs section, remove the ListIDs section" — so the
 * two keys are mutually exclusive in the body, not merely in the docs.
 */
Deno.test("campaign-create: sends ListIDs alone when lists are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("cid1") }]);
  await campaignCreate.execute({ ...BASE, listIds: ["l1", "l2"] }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.ListIDs, ["l1", "l2"]);
  assertEquals("SegmentIDs" in body, false);
});

Deno.test("campaign-create: sends SegmentIDs alone when segments are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("cid1") }]);
  await campaignCreate.execute({ ...BASE, segmentIds: ["s1"] }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.SegmentIDs, ["s1"]);
  assertEquals("ListIDs" in body, false);
});

Deno.test("campaign-create: refuses both at once, before spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignCreate.execute({ ...BASE, listIds: ["l1"], segmentIds: ["s1"] }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: refuses neither, which the API answers with code 315", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await campaignCreate.execute({ ...BASE }, ctx), Error, "315");
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: InlineCss defaults to true, matching the API", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("c") }]);
  await campaignCreate.execute({ ...BASE, listIds: ["l1"] }, ctx);
  assertEquals(bodyOf(calls[0]).InlineCss, true);
});

/** A repeat with the same Name fails with code 303. */
Deno.test("campaign-create: is declared NOT idempotent", () => {
  assertEquals(campaignCreate.idempotent, false);
});
