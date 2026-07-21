import Link from "next/link";
import { Anchor, Badge, Box, Group, Progress, Stack, Text, Title } from "@mantine/core";
import type { Dictionary } from "@/i18n/dictionaries";

export function VerdictPreview({ dict, href }: { dict: Dictionary["preview"]; href?: string }) {
  const card = (
    <Box bg="gray.0" h="100%" p="lg">
      <Stack gap="sm" h="100%" justify="center">
        <Group justify="space-between">
          <Badge color="orange" variant="filled">
            {dict.levelLabel}
          </Badge>
          <Badge color="gray" variant="light">
            {dict.exampleTag}
          </Badge>
        </Group>
        <Group align="end" gap="xs">
          <Title order={2} size={48}>
            72
          </Title>
          <Text c="dimmed" mb={8}>
            {dict.outOf}
          </Text>
        </Group>
        <Stack gap={6}>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">
              {dict.supported}
            </Text>
            <Text fw={700} size="sm">
              18%
            </Text>
          </Group>
          <Progress color="green" value={18} />
          <Group justify="space-between" mt={4}>
            <Text c="dimmed" size="sm">
              {dict.signals}
            </Text>
            <Text fw={700} size="sm">
              40%
            </Text>
          </Group>
          <Progress color="orange" value={40} />
        </Stack>
        {href ? (
          <Text c="indigo.7" fw={600} size="sm">
            {dict.seeExample}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );

  if (!href) return card;
  return (
    <Anchor component={Link} href={href} underline="never">
      {card}
    </Anchor>
  );
}
