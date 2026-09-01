import type { Option } from "@w6w/types";

/**
 * The language codes MessageBird documents as valid for the Verify and Voice
 * Messaging APIs' text-to-speech `language` parameter (identical list on both
 * pages). Shared here rather than duplicated per action.
 */
export const TTS_LANGUAGE_OPTIONS: Option[] = [
  { value: "cy-gb", label: "Welsh (UK)" },
  { value: "da-dk", label: "Danish (Denmark)" },
  { value: "de-de", label: "German (Germany)" },
  { value: "el-gr", label: "Greek (Greece)" },
  { value: "en-au", label: "English (Australia)" },
  { value: "en-gb", label: "English (UK)" },
  { value: "en-gb-wls", label: "English (Wales)" },
  { value: "en-in", label: "English (India)" },
  { value: "en-us", label: "English (US)" },
  { value: "es-es", label: "Spanish (Spain)" },
  { value: "es-mx", label: "Spanish (Mexico)" },
  { value: "es-us", label: "Spanish (US)" },
  { value: "fr-ca", label: "French (Canada)" },
  { value: "fr-fr", label: "French (France)" },
  { value: "id-id", label: "Indonesian (Indonesia)" },
  { value: "is-is", label: "Icelandic (Iceland)" },
  { value: "it-it", label: "Italian (Italy)" },
  { value: "ja-jp", label: "Japanese (Japan)" },
  { value: "ko-kr", label: "Korean (Korea)" },
  { value: "ms-my", label: "Malay (Malaysia)" },
  { value: "nb-no", label: "Norwegian (Norway)" },
  { value: "nl-nl", label: "Dutch (Netherlands)" },
  { value: "pl-pl", label: "Polish (Poland)" },
  { value: "pt-br", label: "Portuguese (Brazil)" },
  { value: "pt-pt", label: "Portuguese (Portugal)" },
  { value: "ro-ro", label: "Romanian (Romania)" },
  { value: "ru-ru", label: "Russian (Russia)" },
  { value: "sv-se", label: "Swedish (Sweden)" },
  { value: "ta-in", label: "Tamil (India)" },
  { value: "th-th", label: "Thai (Thailand)" },
  { value: "tr-tr", label: "Turkish (Turkey)" },
  { value: "vi-vn", label: "Vietnamese (Vietnam)" },
  { value: "zh-cn", label: "Chinese (China)" },
  { value: "zh-hk", label: "Chinese (Hong Kong)" },
];

export const TTS_VOICE_OPTIONS: Option[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** Strip a leading `+` — MessageBird's msisdn fields are plain digits (no `+`). */
export function toMsisdn(recipient: string): string {
  return recipient.trim().replace(/^\+/, "");
}
