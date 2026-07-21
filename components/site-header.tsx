import Link from "next/link";
import { Anchor, Button, Container, Group, Text } from "@mantine/core";
import { LanguageToggle } from "@/components/language-toggle";
import type { Dictionary, Locale } from "@/i18n/dictionaries";

export function SiteHeader({
  locale,
  dict,
  showNewAnalysis = false,
  onDark = false
}: {
  locale: Locale;
  dict: Dictionary["header"];
  showNewAnalysis?: boolean;
  onDark?: boolean;
}) {
  const homeHref = `/?lang=${locale}`;
  return (
    <Container size="lg" py="md">
      <Group justify="space-between">
        <Anchor component={Link} href={homeHref} underline="never">
          <Text c={onDark ? "indigo.3" : "indigo.7"} fw={800} size="lg">
            CONTRAST AI
          </Text>
        </Anchor>
        <Group gap="sm">
          {showNewAnalysis ? (
            <Button color="indigo" component={Link} href={homeHref} size="xs" variant="light">
              {dict.newAnalysis}
            </Button>
          ) : null}
          <LanguageToggle locale={locale} />
        </Group>
      </Group>
    </Container>
  );
}
