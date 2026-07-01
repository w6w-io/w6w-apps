import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-append.ts";

Deno.test("sheet-append: POSTs values.append with 2D values", async () => {
  const { ctx, calls } = mockCtx([{ body: { updates: { updatedRows: 2 } } }]);
  await action.execute({
    spreadsheetId: "ss-1",
    range: "Sheet1!A:B",
    values: [["a", 1], ["b", 2]],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A%3AB:append");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("valueInputOption"), "USER_ENTERED");
  assertEquals(url.searchParams.get("insertDataOption"), "INSERT_ROWS");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.values, [["a", 1], ["b", 2]]);
});
