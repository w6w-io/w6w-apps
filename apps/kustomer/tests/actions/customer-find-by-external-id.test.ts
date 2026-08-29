import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/customer-find-by-external-id.ts";

Deno.test("customer-find-by-external-id: GETs /customers/externalId={externalId}", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1" } } }]);
  const out = await action.execute({ externalId: "crm-42" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/customers/externalId=crm-42",
  );
  assertEquals(out, { id: "1" });
});
