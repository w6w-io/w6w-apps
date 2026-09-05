import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-count-get.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("contacts-count-get: GETs /contacts/count with only the filters that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact_count: 100 } }], conn);
  const out = await action.execute({ dateFrom: "2026-01-01" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/contacts/count?date_from=2026-01-01",
  );
  assertEquals(out, { contact_count: 100 });
});

Deno.test("contacts-count-get: omits both filters when neither is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact_count: 5 } }], conn);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://live-mt-server.wati.io/12345/api/ext/v3/contacts/count");
});
