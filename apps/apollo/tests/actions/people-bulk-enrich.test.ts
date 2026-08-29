import { assertEquals, assertRejects } from "@std/assert";
import peopleBulkEnrich from "../../actions/people-bulk-enrich.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("people-bulk-enrich: sends details as a JSON body and flags as query params, on one request", async () => {
  const { ctx, calls } = mockCtx([
    { body: { matches: [{ id: "p1" }], missing_records: 0, credits_consumed: 1 } },
  ]);
  const out = await peopleBulkEnrich.execute(
    { details: [{ email: "a@b.com" }], reveal_personal_emails: true },
    ctx,
  ) as { matches: unknown[]; credits_consumed: number };

  assertEquals(calls.length, 1);
  assertEquals(queryOf(calls[0].url).reveal_personal_emails, "true");
  assertEquals(JSON.parse(calls[0].body!), { details: [{ email: "a@b.com" }] });
  assertEquals(out.matches.length, 1);
  assertEquals(out.credits_consumed, 1);
});

Deno.test("people-bulk-enrich: accepts details as a JSON string, matching the json param type", async () => {
  const { ctx, calls } = mockCtx([{ body: { matches: [] } }]);
  await peopleBulkEnrich.execute({ details: '[{"email": "a@b.com"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { details: [{ email: "a@b.com" }] });
});

Deno.test("people-bulk-enrich: rejects more than 10 people before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const details = Array.from({ length: 11 }, (_, i) => ({ email: `p${i}@x.com` }));
  await assertRejects(
    () => Promise.resolve(peopleBulkEnrich.execute({ details }, ctx)),
    Error,
    "at most 10",
  );
  assertEquals(calls.length, 0);
});

Deno.test("people-bulk-enrich: rejects an empty details array before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(peopleBulkEnrich.execute({ details: [] }, ctx)),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
