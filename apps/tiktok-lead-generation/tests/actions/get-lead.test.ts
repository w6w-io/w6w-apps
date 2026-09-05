import { assertEquals, assertRejects } from "@std/assert";
import getLead from "../../actions/get-lead.ts";
import { API_ROOT, envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-lead: calls GET /lead/get/ with the standard scoping params", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ leads: [{ lead_id: "1" }] }) },
  ]);

  const out = await getLead.execute(
    { advertiserId: "adv-1", filtering: { form_id: "form-1" }, page: 1, pageSize: 10 },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `${new URL(API_ROOT).pathname}/lead/get/`);

  const query = queryOf(calls[0].url);
  assertEquals(query.advertiser_id, "adv-1");
  assertEquals(query.filtering, JSON.stringify({ form_id: "form-1" }));
  assertEquals(query.page, "1");
  assertEquals(query.page_size, "10");

  assertEquals(out, { data: { leads: [{ lead_id: "1" }] } });
});

Deno.test("get-lead: omits optional params entirely when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await getLead.execute({ advertiserId: "adv-1" }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(Object.keys(query).sort(), ["advertiser_id"]);
});

Deno.test("get-lead: a nonzero TikTok error code raises, carrying the message", async () => {
  const { ctx } = mockCtx([
    { body: errorEnvelope(40105, "Access token is incorrect or has been revoked.") },
  ]);

  const err = await assertRejects(
    async () => await getLead.execute({ advertiserId: "adv-1" }, ctx),
  );
  assertEquals((err as { code: number }).code, 40105);
});
