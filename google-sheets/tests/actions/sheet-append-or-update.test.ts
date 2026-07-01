import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-append-or-update.ts";

Deno.test("sheet-append-or-update: updates matched rows and appends the rest", async () => {
  const { ctx, calls } = mockCtx([
    // 1. GET whole sheet — headers + two existing rows.
    {
      body: {
        values: [
          ["id", "name"],
          ["1", "Alice"],
          ["2", "Bob"],
        ],
      },
    },
    // 2. PUT for the update on the matched `id=2` row.
    { body: { updatedRange: "Sheet1!A3" } },
    // 3. Final append for the new `id=3` row.
    { body: { updates: { updatedRows: 1 } } },
  ]);

  const result = await action.execute({
    spreadsheetId: "ss-1",
    sheetName: "Sheet1",
    columnToMatchOn: "id",
    rows: [
      { id: "2", name: "Robert" }, // exists → update
      { id: "3", name: "Carol" }, // new → append
    ],
  }, ctx) as { updatedCount: number; appendedCount: number };

  // Read call.
  assertEquals(new URL(calls[0].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1");
  // Update call.
  assertEquals(new URL(calls[1].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A3");
  assertEquals(calls[1].method, "PUT");
  const updateBody = JSON.parse(calls[1].body!);
  assertEquals(updateBody.values, [["2", "Robert"]]);
  // Append call.
  assertEquals(new URL(calls[2].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A%3AA:append");
  const appendBody = JSON.parse(calls[2].body!);
  assertEquals(appendBody.values, [["3", "Carol"]]);
  assertEquals(result.updatedCount, 1);
  assertEquals(result.appendedCount, 1);
});
