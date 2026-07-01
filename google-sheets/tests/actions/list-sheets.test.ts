import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-sheets.ts";

Deno.test("list-sheets: GET /v4/spreadsheets/{id} with fields mask, returns tab properties", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      sheets: [
        { properties: { sheetId: 0, title: "Sheet1", index: 0 } },
        { properties: { sheetId: 1234, title: "Data", index: 1 } },
      ],
    },
  }]);
  const result = await action.execute({ spreadsheetId: "ss-1" }, ctx) as {
    sheets: Array<{ title: string }>;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1");
  assertEquals(url.searchParams.get("fields"), "sheets.properties");
  assertEquals(result.sheets.length, 2);
  assertEquals(result.sheets[0].title, "Sheet1");
  assertEquals(result.sheets[1].title, "Data");
});
