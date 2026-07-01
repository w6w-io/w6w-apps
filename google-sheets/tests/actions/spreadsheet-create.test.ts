import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/spreadsheet-create.ts";

Deno.test("spreadsheet-create: POST /v4/spreadsheets with title + sheets", async () => {
  const { ctx, calls } = mockCtx([{ body: { spreadsheetId: "abc" } }]);
  const result = await action.execute({
    title: "My Sheet",
    sheets: [{ title: "Data" }, { title: "Hidden", hidden: true }],
    locale: "en_US",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://sheets.googleapis.com");
  assertEquals(url.pathname, "/v4/spreadsheets");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.title, "My Sheet");
  assertEquals(body.properties.locale, "en_US");
  assertEquals(body.sheets.length, 2);
  assertEquals(body.sheets[0].properties.title, "Data");
  assertEquals(body.sheets[1].properties.hidden, true);
  assertEquals(result, { spreadsheetId: "abc" });
});
