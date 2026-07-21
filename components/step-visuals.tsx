import { Badge, Box, Group, Paper, Stack, Text } from "@mantine/core";
import type { Dictionary } from "@/i18n/dictionaries";

export function StepVisualLink() {
  return (
    <Box bg="gray.0" h="100%" p="lg">
      <Stack gap="sm" h="100%" justify="center">
        <Paper px="md" py="xs" radius="sm" withBorder>
          <Text c="dimmed" size="sm" truncate>
            https://www.youtube.com/watch?v=…
          </Text>
        </Paper>
      </Stack>
    </Box>
  );
}

export function StepVisualContrast({ dict }: { dict: Dictionary["home"] }) {
  return (
    <Box bg="gray.0" h="100%" p="lg">
      <Stack gap="sm" h="100%" justify="center">
        <Group gap="xs" wrap="nowrap">
          <Badge color="green" variant="light">
            {dict.visualMatch}
          </Badge>
          <Text size="sm">{dict.visualSource}</Text>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Badge color="red" variant="light">
            {dict.visualMismatch}
          </Badge>
          <Text size="sm">{dict.visualClaim}</Text>
        </Group>
      </Stack>
    </Box>
  );
}
