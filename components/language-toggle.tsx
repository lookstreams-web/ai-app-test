"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@mantine/core";
import type { Locale } from "@/i18n/dictionaries";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();

  function change(next: string) {
    if (next === locale) return;
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    router.replace(`${url.pathname}${url.search}`);
  }

  return (
    <SegmentedControl
      data={[
        { label: "ES", value: "es" },
        { label: "EN", value: "en" }
      ]}
      onChange={change}
      size="xs"
      value={locale}
    />
  );
}
