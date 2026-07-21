"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";

export function CreateAnalysisForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceType: "youtube", url })
      });
      const body = await response.json();
      if (!response.ok || !body.id)
        throw new Error(body.error?.message ?? "No pudimos iniciar el análisis.");
      router.push(`/analysis/${body.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos iniciar el análisis.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper withBorder radius="lg" p={{ base: "md", sm: "xl" }} shadow="sm">
      <Stack gap="md">
        <div>
          <Title order={2}>Analiza un video de YouTube</Title>
          <Text c="dimmed" mt={6}>
            Revisaremos lo que dice el video y las fuentes disponibles. El análisis no juzga a la
            persona creadora.
          </Text>
        </div>
        <form onSubmit={submit}>
          <Stack gap="sm">
            <TextInput
              description="Pega un enlace público con subtítulos disponibles."
              label="Enlace del video"
              onChange={(event) => setUrl(event.currentTarget.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              type="url"
              value={url}
            />
            {error ? (
              <Alert color="red" title="No pudimos iniciar el análisis">
                {error}
              </Alert>
            ) : null}
            <Button color="orange" loading={submitting} size="md" type="submit">
              Analizar video
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}
