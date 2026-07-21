import Link from "next/link";
import { Anchor, Button, Container, Group, Text } from "@mantine/core";

export function SiteHeader({ showNewAnalysis = false }: { showNewAnalysis?: boolean }) {
  return (
    <Container size="lg" py="md">
      <Group justify="space-between">
        <Anchor component={Link} href="/" underline="never">
          <Group gap={6}>
            <Text c="orange.7" fw={800} size="lg">
              VEREDICTO
            </Text>
            <Text c="dimmed" size="sm" visibleFrom="sm">
              Análisis con evidencia
            </Text>
          </Group>
        </Anchor>
        {showNewAnalysis ? (
          <Button color="orange" component={Link} href="/" size="xs" variant="light">
            Analizar otro video
          </Button>
        ) : null}
      </Group>
    </Container>
  );
}
