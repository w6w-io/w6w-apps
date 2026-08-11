import { assert, assertEquals, assertRejects } from "@std/assert";
import formList from "../../actions/form-list.ts";
import formGet from "../../actions/form-get.ts";
import formFields from "../../actions/form-fields.ts";
import entryList from "../../actions/entry-list.ts";
import entryCount from "../../actions/entry-count.ts";
import entryCreate from "../../actions/entry-create.ts";
import reportList from "../../actions/report-list.ts";
import reportEntries from "../../actions/report-entries.ts";
import { envelope, mockWufooCtx } from "../_helpers.ts";

Deno.test("form-list: unwraps the Forms envelope", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Forms", [{ Hash: "h1" }]) }]);
  const out = await formList.execute({ includeTodayCount: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/forms.json");
  assertEquals(new URL(calls[0].url).searchParams.get("includeTodayCount"), "true");
  assertEquals(out, [{ Hash: "h1" }]);
});

/**
 * Wufoo wraps a single form in the collection envelope too. An action called
 * "Get Form" returning a one-element array would be a small lie.
 */
Deno.test("form-get: returns the form itself, not a one-element array", async () => {
  const { ctx, calls } = mockWufooCtx([{
    body: envelope("Forms", [{ Hash: "h1", Name: "Tiny" }]),
  }]);
  const out = await formGet.execute({ identifier: "h1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/forms/h1.json");
  assertEquals(out, { Hash: "h1", Name: "Tiny" });
});

Deno.test("form-fields: unwraps Fields and only asks for system fields when told", async () => {
  const { ctx, calls } = mockWufooCtx([
    { body: envelope("Fields", [{ ID: "Field1" }]) },
    { body: envelope("Fields", []) },
  ]);
  const out = await formFields.execute({ identifier: "h1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/forms/h1/fields.json");
  assertEquals(new URL(calls[0].url).searchParams.get("system"), null);
  assertEquals(out, [{ ID: "Field1" }]);
  await formFields.execute({ identifier: "h1", system: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("system"), "true");
});

Deno.test("entry-list: maps paging and sorting onto Wufoo's parameter names", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Entries", []) }]);
  await entryList.execute({
    identifier: "h1",
    sort: "EntryId",
    sortDirection: "DESC",
    pageStart: 25,
    pageSize: 100,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/forms/h1/entries.json");
  assertEquals(url.searchParams.get("sort"), "EntryId");
  assertEquals(url.searchParams.get("sortDirection"), "DESC");
  assertEquals(url.searchParams.get("pageStart"), "25");
  assertEquals(url.searchParams.get("pageSize"), "100");
});

/** Filters become numbered parameters whose value is three space-separated parts. */
Deno.test("entry-list: builds numbered Filter parameters from structured input", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Entries", []) }]);
  await entryList.execute({
    identifier: "h1",
    filters: '[{"field":"Field1","operator":"Is_equal_to","value":"Wufoo"},' +
      '{"field":"EntryId","operator":"Is_greater_than","value":1}]',
    match: "AND",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("Filter1"), "Field1 Is_equal_to Wufoo");
  assertEquals(url.searchParams.get("Filter2"), "EntryId Is_greater_than 1");
  assertEquals(url.searchParams.get("match"), "AND");
});

Deno.test("entry-list: refuses an operator Wufoo does not publish", async () => {
  const { ctx, calls } = mockWufooCtx([]);
  await assertRejects(
    async () => {
      await entryList.execute(
        { identifier: "h1", filters: '[{"field":"Field1","operator":"equals","value":"x"}]' },
        ctx,
      );
    },
    Error,
    "unknown operator",
  );
  assertEquals(calls.length, 0, "nothing should have been sent");
});

/** The count endpoint is a value, not a collection — it must not be unwrapped. */
Deno.test("entry-count: returns the EntryCount object as the vendor sends it", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: { EntryCount: "42" } }]);
  const out = await entryCount.execute({ identifier: "h1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/forms/h1/entries/count.json");
  assertEquals(out, { EntryCount: "42" });
});

/** Submission is form-encoded and keyed by field id, not by label. */
Deno.test("entry-create: posts url-encoded field ids", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: { Success: 1, EntryId: "7" } }]);
  const out = await entryCreate.execute(
    { identifier: "h1", fields: '{"Field1":"Ada","Field105":"ada@example.com"}' },
    ctx,
  ) as { EntryId?: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "Field1=Ada&Field105=ada%40example.com");
  assertEquals(out.EntryId, "7");
});

/**
 * The most damaging failure mode this app guards: Wufoo answers a REJECTED
 * submission with HTTP 200 and `Success: 0`. Anything checking only the status
 * code records a failed submission as a success.
 */
Deno.test("entry-create: turns a 200 with Success 0 into a real error", async () => {
  const { ctx } = mockWufooCtx([{
    body: {
      Success: 0,
      ErrorText: "Errors have been highlighted below.",
      FieldErrors: [
        { ID: "Field105", ErrorText: "This field is required." },
        { ID: "Field106", ErrorText: "Please enter a number." },
      ],
    },
  }]);
  const err = await assertRejects(async () => {
    await entryCreate.execute({ identifier: "h1", fields: '{"Field1":"x"}' }, ctx);
  }, Error);
  assert(err.message.includes("Field105: This field is required."), err.message);
  assert(err.message.includes("Field106: Please enter a number."), err.message);
});

/** Every other scalar in this API is a string, so `"0"` must fail too. */
Deno.test("entry-create: treats a string Success the same as a number", async () => {
  const { ctx } = mockWufooCtx([{ body: { Success: "0", ErrorText: "nope" } }]);
  await assertRejects(
    async () => {
      await entryCreate.execute({ identifier: "h1", fields: '{"Field1":"x"}' }, ctx);
    },
    Error,
    "Wufoo rejected the entry",
  );

  const ok = mockWufooCtx([{ body: { Success: "1", EntryId: "8" } }]);
  const out = await entryCreate.execute(
    { identifier: "h1", fields: '{"Field1":"x"}' },
    ok.ctx,
  ) as { EntryId?: string };
  assertEquals(out.EntryId, "8");
});

Deno.test("entry-create: rejects a non-object or empty payload before sending", async () => {
  const { ctx, calls } = mockWufooCtx([]);
  await assertRejects(
    async () => {
      await entryCreate.execute({ identifier: "h1", fields: '["Field1"]' }, ctx);
    },
    Error,
    "object keyed by field id",
  );
  await assertRejects(
    async () => {
      await entryCreate.execute({ identifier: "h1", fields: "{}" }, ctx);
    },
    Error,
    "empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("entry-create: is honestly not idempotent", () => {
  assertEquals(entryCreate.idempotent, false);
});

Deno.test("report-list: unwraps Reports and takes no parameters", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Reports", [{ Hash: "r1" }]) }]);
  const out = await reportList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/reports.json");
  assertEquals(out, [{ Hash: "r1" }]);
  assertEquals(reportList.params?.length ?? 0, 0);
});

Deno.test("report-entries: pages the report's own entries", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Entries", [{ EntryId: "1" }]) }]);
  const out = await reportEntries.execute({ identifier: "r1", pageSize: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/reports/r1/entries.json");
  assertEquals(url.searchParams.get("pageSize"), "50");
  assertEquals(out, [{ EntryId: "1" }]);
});

Deno.test("actions: the submission rate limit surfaces the vendor's own text", async () => {
  const { ctx } = mockWufooCtx([{ status: 429, body: { Text: "Slow Down", HTTPCode: 429 } }]);
  await assertRejects(
    async () => {
      await entryCreate.execute({ identifier: "h1", fields: '{"Field1":"x"}' }, ctx);
    },
    Error,
    "Slow Down",
  );
});
