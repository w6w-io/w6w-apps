import { assertEquals } from "@std/assert";
import { listRequest } from "../../lib/params.ts";

Deno.test("listRequest: plain listing when no filter field is set", () => {
  const { path, query } = listRequest("Contacts", { top: 10, skip: 5, brief: true });
  assertEquals(path, "/Contacts");
  assertEquals(query, { top: 10, skip: 5, brief: true });
});

Deno.test("listRequest: switches to /Search once a filter field is set", () => {
  const { path, query } = listRequest("Leads", {
    fieldName: "LEAD_RATING",
    fieldValue: "5",
    updatedAfterUtc: "2026-01-01T00:00:00Z",
    top: 10,
  });
  assertEquals(path, "/Leads/Search");
  assertEquals(query, {
    field_name: "LEAD_RATING",
    field_value: "5",
    updated_after_utc: "2026-01-01T00:00:00Z",
    top: 10,
    skip: undefined,
    brief: undefined,
  });
});
