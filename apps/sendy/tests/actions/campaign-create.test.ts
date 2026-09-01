import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-create.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

const base = {
  fromName: "Ada",
  fromEmail: "ada@example.com",
  replyTo: "ada@example.com",
  title: "Launch",
  subject: "We launched",
  htmlText: "<p>hi</p>",
};

Deno.test("campaign-create: a draft posts to /api/campaigns/create.php", async () => {
  const { ctx, calls } = mockCtx([{ body: "Campaign created" }], conn);
  const result = await action.execute({ ...base, brandId: "b1" }, ctx);
  assertEquals(calls[0].url, "https://example.com/sendy/api/campaigns/create.php");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("from_name"), "Ada");
  assertEquals(body.get("html_text"), "<p>hi</p>");
  assertEquals(body.get("brand_id"), "b1");
  assertEquals(body.get("send_campaign"), null);
  assertEquals(result, { message: "Campaign created" });
});

Deno.test("campaign-create: sendCampaign=true sends send_campaign=1", async () => {
  const { ctx, calls } = mockCtx([{ body: "Campaign created and now sending" }], conn);
  const result = await action.execute({ ...base, listIds: "l1", sendCampaign: true }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("send_campaign"), "1");
  assertEquals(result, { message: "Campaign created and now sending" });
});

Deno.test("campaign-create: a documented error becomes a thrown error", async () => {
  const { ctx } = mockCtx([{ body: "HTML not passed" }], conn);
  await assertRejects(
    async () => await action.execute({ ...base, brandId: "b1" }, ctx),
    Error,
    "HTML not passed",
  );
});

Deno.test("campaign-create: is not idempotent — every success creates a new campaign", () => {
  assert(action.idempotent === false);
});
