import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-api-usage.ts";

Deno.test("get-api-usage: GETs /v2/getapiusage with start_date and end_date query params", async () => {
  const body = { total: 100, status_valid: 80, status_invalid: 20 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ startDate: "2026-01-01", endDate: "2026-01-31" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.zerobounce.net");
  assertEquals(url.pathname, "/v2/getapiusage");
  assertEquals(url.searchParams.get("start_date"), "2026-01-01");
  assertEquals(url.searchParams.get("end_date"), "2026-01-31");
  assertEquals(result, body);
});

Deno.test("get-api-usage: requires startDate and endDate", () => {
  assertEquals(action.params?.find((p) => p.key === "startDate")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "endDate")?.required, true);
});

Deno.test("get-api-usage: is a read action scoped to the account resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "account");
});
