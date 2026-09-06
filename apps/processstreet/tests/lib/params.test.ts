import { assertEquals } from "@std/assert";
import { cursorParams } from "../../lib/params.ts";

Deno.test("cursorParams: declares a single, advanced, optional `cursor` field", () => {
  assertEquals(cursorParams.length, 1);
  assertEquals(cursorParams[0].key, "cursor");
  assertEquals(cursorParams[0].required, undefined);
});
