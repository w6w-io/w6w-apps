import { assertEquals } from "@std/assert";
import { pageBody } from "../../lib/params.ts";

Deno.test("pageBody: undefined when neither pageSize nor pageNumber is set", () => {
  assertEquals(pageBody({}), undefined);
});

Deno.test("pageBody: fills in the vendor defaults for whichever half is missing", () => {
  assertEquals(pageBody({ pageSize: 5 }), { size: 5, number: 1 });
  assertEquals(pageBody({ pageNumber: 3 }), { size: 20, number: 3 });
  assertEquals(pageBody({ pageSize: 5, pageNumber: 3 }), { size: 5, number: 3 });
});
