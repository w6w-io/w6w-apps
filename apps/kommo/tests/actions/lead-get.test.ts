import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("lead-get: GETs /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 152464, name: "Example" } }], conn);
  const out = await action.execute!({ id: 152464 }, ctx);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads/152464");
  assertEquals(out.lead, { id: 152464, name: "Example" });
});

Deno.test("lead-get: joins withEmbed into the with= query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }], conn);
  await action.execute!({ id: 1, withEmbed: ["contacts", "source_id"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("with"), "contacts,source_id");
});

Deno.test("lead-get: type is read, and resource is lead", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "lead");
});
