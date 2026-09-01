import { assertEquals } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("project-create: sends only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1", name: "Acme" } }]);
  await projectCreate.execute({ name: "Acme" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
});

Deno.test("project-create: forwards team, languages and project type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectCreate.execute(
    {
      name: "Acme",
      teamId: 5,
      languages: '[{"lang_iso":"en"}]',
      baseLangIso: "en",
      projectType: "localization_files",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    team_id: 5,
    languages: [{ lang_iso: "en" }],
    base_lang_iso: "en",
    project_type: "localization_files",
  });
});

Deno.test("project-create: is not idempotent — no dedupe of any kind on the vendor side", () => {
  assertEquals(projectCreate.idempotent, false);
});
