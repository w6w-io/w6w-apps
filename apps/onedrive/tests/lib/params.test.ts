import { assert, assertEquals } from "@std/assert";
import {
  conflictBehaviorParam,
  driveIdParam,
  itemParams,
  pagingParams,
  selectParams,
} from "../../lib/params.ts";

Deno.test("itemParams: returns a fresh array each call, so actions can splice safely", () => {
  const a = itemParams();
  const b = itemParams();
  assert(a !== b);
  a.push({ key: "extra", label: "Extra", type: "string" });
  assertEquals(b.length, 2);
});

Deno.test("itemParams: neither addressing form is `required` — the client enforces the pair", () => {
  for (const param of itemParams()) {
    assertEquals(param.required, undefined, param.key);
  }
});

Deno.test("itemParams: the root hint appears only when the root is a legal answer", () => {
  const withRoot = itemParams({ rootMeans: "the drive's root folder" });
  assert(withRoot.every((p) => (p.hint ?? "").includes("Leave both empty")));
  const withoutRoot = itemParams();
  assert(withoutRoot.every((p) => !(p.hint ?? "").includes("Leave both empty")));
});

Deno.test("driveIdParam: advanced, because the common answer is the user's own drive", () => {
  assertEquals(driveIdParam.key, "driveId");
  assertEquals(driveIdParam.advanced, true);
  assertEquals(driveIdParam.required, undefined);
});

Deno.test("selectParams: offers $select and $expand, and no $filter", () => {
  assertEquals(selectParams().map((p) => p.key), ["select", "expand"]);
});

Deno.test("pagingParams: no $skip — these collections page by token, not by offset", () => {
  const keys = pagingParams().map((p) => p.key);
  assertEquals(keys, ["top", "orderby", "nextLink", "all", "maxPages"]);
});

Deno.test("pagingParams: the page cap is bounded so `all` cannot walk forever", () => {
  const maxPages = pagingParams().find((p) => p.key === "maxPages");
  assertEquals(maxPages?.default, 10);
  assertEquals(maxPages?.validation?.max, 100);
});

Deno.test("conflictBehaviorParam: exactly Graph's three values, `fail` marked as the default", () => {
  const param = conflictBehaviorParam("hint");
  assertEquals(
    (param.options as Array<{ value: string }>).map((o) => o.value),
    ["fail", "rename", "replace"],
  );
  // Graph's own default when the annotation is absent — so the param is not
  // pre-set, and the hint says which way it falls.
  assertEquals(param.default, undefined);
  assertEquals(param.hint, "hint");
});
