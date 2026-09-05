import { assertEquals } from "@std/assert";
import { idParam, labelColorOptions, paginationParams, sortParam } from "../../lib/params.ts";

Deno.test("paginationParams: declares items and page as number params", () => {
  const keys = paginationParams.map((p) => p.key);
  assertEquals(keys, ["items", "page"]);
  assertEquals(paginationParams.every((p) => p.type === "number"), true);
});

Deno.test("sortParam: a string param named sort", () => {
  assertEquals(sortParam.key, "sort");
  assertEquals(sortParam.type, "string");
});

Deno.test("idParam: required number param named id", () => {
  const p = idParam("Widget ID", "hint");
  assertEquals(p, { key: "id", label: "Widget ID", type: "number", required: true, hint: "hint" });
});

Deno.test("labelColorOptions: nine named colors, matching the vendor's fixed palette", () => {
  assertEquals(labelColorOptions.length, 9);
  const values = labelColorOptions.map((o) => o.value);
  assertEquals(new Set(values).size, 9);
  assertEquals(values.includes("d93651"), true); // red
  assertEquals(values.includes("98aab3"), true); // grey
});
