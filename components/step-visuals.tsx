import { Badge, Box, Divider, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./step-visuals.module.css";

const waveBars = Array.from({ length: 14 }, (_, index) => `bar-${index}`);

export function StepVisualLink({ dict }: { dict: Dictionary["home"] }) {
  return (
    <Box bg="gray.0" h="100%" p="lg">
      <Stack gap="xs" h="100%" justify="center">
        <Paper px="md" py="xs" radius="sm" withBorder>
          <Text c="dimmed" size="sm" truncate>
            https://www.youtube.com/watch?v=…
          </Text>
        </Paper>
        <Divider label={dict.visualOr} labelPosition="center" />
        <Paper px="md" py="xs" radius="sm" withBorder>
          <Group gap="sm" wrap="nowrap">
            <span aria-hidden className={styles.recDot} />
            <span aria-hidden className={styles.wave}>
              {waveBars.map((bar) => (
                <span key={bar} />
              ))}
            </span>
            <Text c="dimmed" size="sm">
              {dict.visualRecording} · 00:32
            </Text>
          </Group>
        </Paper>
      </Stack>
    </Box>
  );
}

export function StepVisualContrast({ dict }: { dict: Dictionary["home"] }) {
  return (
    <Box bg="gray.0" h="100%" p="md">
      <Stack gap="sm" h="100%" justify="center">
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Badge color="teal" size="sm">
              {dict.visualConclusion}
            </Badge>
            <Text c="dimmed" size="xs">
              12:10
            </Text>
          </Group>
          <SimpleGrid cols={2} spacing="md">
            <Stack gap={6}>
              <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                {dict.visualSays}
              </Text>
              <span className={styles.skeleton} style={{ width: "90%" }} />
              <span className={styles.skeleton} style={{ width: "65%" }} />
            </Stack>
            <Stack gap={6}>
              <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                {dict.visualFound}
              </Text>
              <span className={styles.skeleton} style={{ width: "100%" }} />
              <span className={styles.skeleton} style={{ width: "85%" }} />
              <span className={styles.skeleton} style={{ width: "50%" }} />
            </Stack>
          </SimpleGrid>
          <Text c="indigo.7" fw={600} mt="sm" size="xs">
            {dict.visualViewSource}
          </Text>
        </Paper>
      </Stack>
    </Box>
  );
}
