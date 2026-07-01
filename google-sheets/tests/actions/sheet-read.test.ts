import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-read.ts";

Deno.test("sheet-read: GET values with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [["a", "b"]] } }]);
  const result = await action.execute(
    { spreadsheetId: "ss-1", range: "Sheet1!A1:B2" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A1%3AB2");
  assertEquals(url.searchParams.get("valueRenderOption"), "FORMATTED_VALUE");
  assertEquals(url.searchParams.get("majorDimension"), "ROWS");
  assertEquals(result, { values: [["a", "b"]] });
});

Deno.test("sheet-read: forwards optional render options when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    spreadsheetId: "ss-1",
    range: "A:A",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
    majorDimension: "COLUMNS",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("valueRenderOption"), "UNFORMATTED_VALUE");
  assertEquals(url.searchParams.get("dateTimeRenderOption"), "SERIAL_NUMBER");
  assertEquals(url.searchParams.get("majorDimension"), "COLUMNS");
});
