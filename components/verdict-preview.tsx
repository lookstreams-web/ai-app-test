import Link from "next/link";
import { Anchor, Badge, Box, Group, Progress, RingProgress, Stack, Text } from "@mantine/core";
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
        <Group align="center" gap="lg" wrap="nowrap">
          <RingProgress
            label={
              <Stack align="center" gap={0}>
                <Text fw={800} fz={28} lh={1}>
                  72
                </Text>
                <Text c="dimmed" size="xs">
                  {dict.outOf}
                </Text>
              </Stack>
            }
            roundCaps
            sections={[{ color: "orange", value: 72 }]}
            size={116}
            thickness={11}
          />
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" justify="space-between" wrap="nowrap">
              <Text c="dimmed" size="sm">
                {dict.supported}
              </Text>
              <Text fw={700} size="sm">
                18%
              </Text>
            </Group>
            <Progress color="green" value={18} />
            {href ? (
              <Text c="indigo.7" fw={600} mt={4} size="sm">
                {dict.seeExample}
              </Text>
            ) : null}
          </Stack>
        </Group>
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
