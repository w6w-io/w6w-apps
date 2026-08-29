import { assertEquals, assertRejects } from "@std/assert";
import organizationBulkEnrich from "../../actions/organization-bulk-enrich.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("organization-bulk-enrich: sends details as a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizations: [{ id: "o1" }] } }]);
  const out = await organizationBulkEnrich.execute({ details: [{ domain: "apollo.io" }] }, ctx) as {
    organizations: unknown[];
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { details: [{ domain: "apollo.io" }] });
  assertEquals(out.organizations.length, 1);
});

Deno.test("organization-bulk-enrich: rejects more than 10 companies before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const details = Array.from({ length: 11 }, (_, i) => ({ domain: `c${i}.com` }));
  await assertRejects(
    () => Promise.resolve(organizationBulkEnrich.execute({ details }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});
