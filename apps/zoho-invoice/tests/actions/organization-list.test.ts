import { assertEquals } from "@std/assert";
import { mockCtx, mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

Deno.test("organization-list: GETs /organizations and never sends an org id header", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", organizations: [{ organization_id: "1" }] } },
  ]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/organizations");
  assertEquals(calls[0].headers["x-com-zoho-invoice-organizationid"], undefined);
  assertEquals(out, { organizations: [{ organization_id: "1" }] });
});

Deno.test("organization-list: works even with no connection recorded yet (defaults to the US host)", async () => {
  const { ctx, calls } = mockCtx([
    { body: { code: 0, message: "success", organizations: [] } },
  ]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.com");
  assertEquals(out, { organizations: [] });
});
