import { cookies, headers } from "next/headers";
import {
  defaultLocale,
  dictionaries,
  isLocale,
  type Dictionary,
  type Locale
} from "./dictionaries";

/** Orden de resolución: ?lang= → cookie → Accept-Language → default. */
export async function resolveLocale(searchParams?: { lang?: string | string[] }): Promise<Locale> {
  const requested = Array.isArray(searchParams?.lang) ? searchParams.lang[0] : searchParams?.lang;
  if (isLocale(requested)) return requested;

  const stored = (await cookies()).get("lang")?.value;
  if (isLocale(stored)) return stored;

  const accepted = (await headers()).get("accept-language") ?? "";
  for (const part of accepted.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }

  return defaultLocale;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
