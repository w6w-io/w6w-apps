import { assertEquals } from "@std/assert";
import {
  apiHostFromConnection,
  compact,
  formatSheetError,
  ZohoSheetClient,
} from "../../lib/client.ts";
import { mockSheetCtx } from "../_helpers.ts";

Deno.test("apiHostFromConnection: reads the recorded region host", () => {
  assertEquals(
    apiHostFromConnection({ display: { apiHost: "sheet.zoho.eu" } } as never),
    "sheet.zoho.eu",
  );
});

Deno.test("apiHostFromConnection: falls back to the US host when unrecorded", () => {
  assertEquals(apiHostFromConnection(undefined), "sheet.zoho.com");
});

Deno.test("formatSheetError: includes the vendor error_code and error_message", () => {
  const msg = formatSheetError(
    401,
    "workbook.list",
    JSON.stringify({
      error_code: 2401,
      error_message: "Valid [authorization ticket] is required for processing the request.",
    }),
  );
  assertEquals(
    msg,
    "Zoho Sheet 401 (error_code 2401) for workbook.list: Valid [authorization ticket] is " +
      "required for processing the request.",
  );
});

Deno.test("formatSheetError: falls back to the raw body when it is not JSON", () => {
  const msg = formatSheetError(500, "worksheet.list", "<html>oops</html>");
  assertEquals(msg, "Zoho Sheet 500 for worksheet.list: <html>oops</html>");
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("ZohoSheetClient: addresses /api/v2/<pathSegment> on the connection's region host", async () => {
  const { ctx, calls } = mockSheetCtx(
    [{ body: { status: "success", method: "worksheet.list", worksheet_names: [] } }],
    "sheet.zoho.eu",
  );
  const body = await new ZohoSheetClient(ctx).call("abc123", "worksheet.list");
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "sheet.zoho.eu");
  assertEquals(url.pathname, "/api/v2/abc123");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URLSearchParams(calls[0].body!).get("method"), "worksheet.list");
  assertEquals(body, { status: "success", method: "worksheet.list", worksheet_names: [] });
});

Deno.test("ZohoSheetClient: JSON.stringifies object/array-valued params into the form body", async () => {
  const { ctx, calls } = mockSheetCtx([
    { body: { status: "success", method: "worksheet.jsondata.append" } },
  ]);
  await new ZohoSheetClient(ctx).call("abc123", "worksheet.jsondata.append", {
    json_data: [{ Name: "Joe" }],
    header_row: 1,
  });
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(JSON.parse(body.get("json_data")!), [{ Name: "Joe" }]);
  assertEquals(body.get("header_row"), "1");
});

Deno.test("ZohoSheetClient: drops undefined/null/empty-string params", async () => {
  const { ctx, calls } = mockSheetCtx([
    { body: { status: "success", method: "worksheet.usedarea" } },
  ]);
  await new ZohoSheetClient(ctx).call("abc123", "worksheet.usedarea", {
    worksheet_name: "Sheet1",
    worksheet_id: undefined,
  });
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.has("worksheet_id"), false);
  assertEquals(body.get("worksheet_name"), "Sheet1");
});

Deno.test("ZohoSheetClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockSheetCtx([
    { status: 401, body: { error_code: 2401, error_message: "no token" } },
  ]);
  await assertRejectsWithMessage(
    () => new ZohoSheetClient(ctx).call("workbooks", "workbook.list"),
    "Zoho Sheet 401 (error_code 2401)",
  );
});

async function assertRejectsWithMessage(fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(needle)) throw e;
  }
}
