import { compact } from "./client.ts";

/** The event attribute set shared by create/update/replace — see the Events schema. */
export interface EventAttributesInput {
  ownerId?: string;
  title?: string;
  slug?: string;
  status?: string;
  everyoneCanSpeak?: boolean;
  detailedRegistrationPageEnabled?: boolean;
  lightRegistrationPageEnabled?: boolean;
  description?: string;
  recordingEnabled?: boolean;
  recordingPublic?: boolean;
  showInCompanyPage?: boolean;
  chatEnabled?: boolean;
  questionsEnabled?: boolean;
  pollsEnabled?: boolean;
}

export const EVENT_ATTRIBUTE_PARAMS = [
  { key: "ownerId", label: "Owner (People) ID", type: "string" as const },
  { key: "title", label: "Title", type: "string" as const },
  { key: "slug", label: "Slug", type: "string" as const },
  { key: "status", label: "Status", type: "string" as const, hint: 'e.g. "published".' },
  { key: "everyoneCanSpeak", label: "Everyone can speak", type: "boolean" as const },
  {
    key: "detailedRegistrationPageEnabled",
    label: "Detailed registration page",
    type: "boolean" as const,
  },
  {
    key: "lightRegistrationPageEnabled",
    label: "Light registration page",
    type: "boolean" as const,
  },
  { key: "description", label: "Description", type: "text" as const, hint: "HTML." },
  { key: "recordingEnabled", label: "Recording enabled", type: "boolean" as const },
  { key: "recordingPublic", label: "Recording public", type: "boolean" as const },
  { key: "showInCompanyPage", label: "Show in company page", type: "boolean" as const },
  { key: "chatEnabled", label: "Chat enabled", type: "boolean" as const },
  { key: "questionsEnabled", label: "Questions enabled", type: "boolean" as const },
  { key: "pollsEnabled", label: "Polls enabled", type: "boolean" as const },
];

export function eventAttributes(input: EventAttributesInput): Record<string, unknown> {
  return compact({
    owner_id: input.ownerId,
    title: input.title,
    slug: input.slug,
    status: input.status,
    everyone_can_speak: input.everyoneCanSpeak,
    detailed_registration_page_enabled: input.detailedRegistrationPageEnabled,
    light_registration_page_enabled: input.lightRegistrationPageEnabled,
    description: input.description,
    recording_enabled: input.recordingEnabled,
    recording_public: input.recordingPublic,
    show_in_company_page: input.showInCompanyPage,
    chat_enabled: input.chatEnabled,
    questions_enabled: input.questionsEnabled,
    polls_enabled: input.pollsEnabled,
  });
}
