import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/organisation-get-many.ts";

Deno.test("organisation-get-many: plain list with no filter", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [{ ORGANISATION_ID: 1 }] }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Organisations");
  assertEquals(out, { organisations: [{ ORGANISATION_ID: 1 }] });
});

Deno.test("organisation-get-many: switches to /Search when a filter field is set", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await action.execute({ fieldName: "ORGANISATION_NAME", fieldValue: "Acme" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Organisations/Search");
  assertEquals(url.searchParams.get("field_value"), "Acme");
});
