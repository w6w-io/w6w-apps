import { assertEquals } from "@std/assert";
import { pageParams, pageQuery } from "../../lib/params.ts";

Deno.test("pageParams: declares page and perPage", () => {
  assertEquals(pageParams.map((p) => p.key), ["page", "perPage"]);
});

Deno.test("pageQuery: passes page/perPage through untouched", () => {
  assertEquals(pageQuery({ page: 2, perPage: 100 }), { page: 2, perPage: 100 });
  assertEquals(pageQuery({}), { page: undefined, perPage: undefined });
});
