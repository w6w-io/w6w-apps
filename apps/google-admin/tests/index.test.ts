import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 18 actions with unique keys", () => {
  assertEquals(app.actions.length, 18);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares both auth methods", () => {
  const keys = app.auth?.map((a) => a.key) ?? [];
  assertEquals(keys.sort(), ["oauth2", "service-account"]);
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

Deno.test("index: every action groups under a resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals(resources, new Set(["user", "group", "member", "orgunit"]));
});
