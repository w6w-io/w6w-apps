import { assert, assertEquals } from "@std/assert";
import type { AppDefinition } from "@w6w/types";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "get-item",
      "get-user",
      "get-max-item-id",
      "list-top-stories",
      "list-new-stories",
      "list-best-stories",
      "list-ask-stories",
      "list-show-stories",
      "list-job-stories",
      "get-updates",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares no auth methods — Hacker News's v0 API is a genuinely no-auth service", () => {
  assertEquals((app as AppDefinition).auth, undefined);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});

Deno.test("index: every action is a read (the whole surface is read-only)", () => {
  for (const action of app.actions) {
    assertEquals(action.type, "read");
  }
});

Deno.test("index: no action requires auth — there is no Connection to require", () => {
  for (const action of app.actions) {
    assert(action.requiresAuth !== true);
  }
});
