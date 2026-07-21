"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import type { Dictionary, Locale } from "@/i18n/dictionaries";

export function CreateAnalysisForm({ dict, locale }: { dict: Dictionary["form"]; locale: Locale }) {
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
      if (!response.ok || !body.id) throw new Error(body.error?.message ?? dict.defaultError);
      router.push(`/analysis/${body.id}?lang=${locale}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.defaultError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper withBorder radius="lg" p={{ base: "md", sm: "xl" }} shadow="sm">
      <Stack gap="md">
        <div>
          <Title order={2}>{dict.title}</Title>
          <Text c="dimmed" mt={6}>
            {dict.description}
          </Text>
        </div>
        <form onSubmit={submit}>
          <Stack gap="sm">
            <TextInput
              description={dict.hint}
              label={dict.label}
              onChange={(event) => setUrl(event.currentTarget.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              type="url"
              value={url}
            />
            {error ? (
              <Alert color="red" title={dict.errorTitle}>
                {error}
              </Alert>
            ) : null}
            <Button color="orange" loading={submitting} size="md" type="submit">
              {dict.submit}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}
