import { assertEquals } from "@std/assert";
import { buildContext, buildMentions, contextParams } from "../../lib/params.ts";

Deno.test("contextParams: declares the two vendor-required fields plus two optional ones", () => {
  const keys = contextParams().map((p) => p.key);
  assertEquals(keys, ["username", "timezone", "fullName", "email"]);
  const required = contextParams().filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["username", "timezone"]);
});

Deno.test("buildContext: always includes username + timezone, drops empty optional fields", () => {
  assertEquals(buildContext({ username: "a", timezone: "UTC" }), {
    username: "a",
    timezone: "UTC",
  });
  assertEquals(
    buildContext({ username: "a", timezone: "UTC", fullName: "A B", email: "a@b.com" }),
    { username: "a", timezone: "UTC", fullName: "A B", email: "a@b.com" },
  );
});

Deno.test("buildMentions: empty/undefined input mentions nobody", () => {
  assertEquals(buildMentions(undefined), []);
  assertEquals(buildMentions(""), []);
});

Deno.test("buildMentions: splits a comma-separated string into Mention objects", () => {
  assertEquals(buildMentions("agent_1, agent_2 ,agent_3"), [
    { configurationId: "agent_1" },
    { configurationId: "agent_2" },
    { configurationId: "agent_3" },
  ]);
});

Deno.test("buildMentions: accepts an array too", () => {
  assertEquals(buildMentions(["agent_1", "agent_2"]), [
    { configurationId: "agent_1" },
    { configurationId: "agent_2" },
  ]);
});
