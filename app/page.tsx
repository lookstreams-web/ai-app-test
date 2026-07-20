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
            <Code>POST /api/analyses</Code> — transcribe YouTube y encola el análisis.
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
        El motor de Eduardo corre de forma asíncrona en el worker. Usa el ID devuelto por la API
        para consultar el progreso y el diagnóstico público.
      </Text>
    </Container>
  );
}
