import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-update.ts";

Deno.test("sheet-update: PUTs values.update with 2D values", async () => {
  const { ctx, calls } = mockCtx([{ body: { updatedRange: "Sheet1!A2:B2" } }]);
  await action.execute({
    spreadsheetId: "ss-1",
    range: "Sheet1!A2:B2",
    values: [["x", "y"]],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A2%3AB2");
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.searchParams.get("valueInputOption"), "USER_ENTERED");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.values, [["x", "y"]]);
});
