'use client';

import { Container, Title, Text, Code, List, Alert } from '@mantine/core';

// Placeholder de arquitectura. La UI final la construye Joel a partir del
// contrato (CONTRATO.md) y el output de /api/analyses.
export default function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Title order={1}>AI App Test — Detector de humo</Title>
      <Text mt="md" c="dimmed">
        Andamiaje de arquitectura (backend). La interfaz final es responsabilidad de Joel.
      </Text>

      <Alert mt="lg" title="Endpoints disponibles" color="blue">
        <List spacing="xs" size="sm">
          <List.Item>
            <Code>POST /api/analyses</Code> — crea y procesa un análisis (YouTube o texto).
          </List.Item>
          <List.Item>
            <Code>GET /api/analyses/[id]</Code> — estado y resultado.
          </List.Item>
          <List.Item>
            <Code>POST /api/transcript</Code> — preview de transcript de YouTube.
          </List.Item>
          <List.Item>
            <Code>GET /api/health</Code> — healthcheck.
          </List.Item>
        </List>
      </Alert>

      <Text mt="lg" size="sm">
        El motor de análisis (Eduardo) es un stub; el pipeline corre end-to-end y deja la fila en{' '}
        <Code>failed</Code> con un mensaje claro hasta que el motor esté conectado.
      </Text>
    </Container>
  );
}
