import { assertEquals } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-create: POSTs name/senderEmail/description to /api/mailing/campaigns", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "Welcome" } }]);
  await campaignCreate.execute({ name: "Welcome", senderEmail: "hi@acme.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/campaigns");
  assertEquals(JSON.parse(calls[0].body!), { name: "Welcome", senderEmail: "hi@acme.com" });
});
