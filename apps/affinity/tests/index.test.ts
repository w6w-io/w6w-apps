import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 39 actions with unique keys", () => {
  assertEquals(app.actions.length, 39);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares exactly one auth method (bearer-token)", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "bearer-token");
});

Deno.test("index: declares both health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys.sort(), ["quota", "service"]);
});

Deno.test("index: every action has a non-empty title and description", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title === "string" && action.title.length > 0, true, action.key);
    assertEquals(
      typeof action.description === "string" && action.description.length > 0,
      true,
      action.key,
    );
  }
});
