import { Container, Title, Text, Code } from '@mantine/core';

// Placeholder de la página de resultado compartible. Joel construye la
// visualización del informe (índice de hype, breakdown, findings) leyendo
// GET /api/analyses/[id].
export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Container size="sm" py="xl">
      <Title order={2}>Análisis</Title>
      <Text mt="md" c="dimmed">
        Placeholder. La visualización del informe la construye Joel.
      </Text>
      <Text mt="md" size="sm">
        ID: <Code>{id}</Code>
      </Text>
      <Text mt="xs" size="sm">
        Datos en <Code>GET /api/analyses/{id}</Code>.
      </Text>
    </Container>
  );
}
