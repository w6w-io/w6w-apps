import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The create path carries a trailing slash — `/contacts/` — distinct from
 * every other contact operation's `/contacts/{key}` (no trailing slash).
 */
Deno.test("contact-create: POSTs to the trailing-slash path", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "c1" } }]);
  await contactCreate.execute({ teamKey: "t1", emailAddresses: ["a@x.com"] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/teams/t1/contacts/");
  assertEquals(JSON.parse(calls[0].body!), { emailAddresses: ["a@x.com"] });
});

Deno.test("contact-create: forwards getIfExisting as a query param, not body", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "c1" } }]);
  await contactCreate.execute(
    { teamKey: "t1", emailAddresses: ["a@x.com"], getIfExisting: true },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { getIfExisting: "true" });
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals("getIfExisting" in body, false);
});
