"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Flex, Paper, Stack, Text, TextInput } from "@mantine/core";
import type { Dictionary, Locale } from "@/i18n/dictionaries";
import styles from "./create-analysis-form.module.css";

export function CreateAnalysisForm({ dict, locale }: { dict: Dictionary["form"]; locale: Locale }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    setPulseKey((key) => key + 1);
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
        <form onSubmit={submit}>
          <Stack gap="sm">
            <Flex
              align={{ base: "stretch", sm: "flex-end" }}
              direction={{ base: "column", sm: "row" }}
              gap="sm"
            >
              <TextInput
                description={dict.hint}
                label={dict.label}
                onChange={(event) => setUrl(event.currentTarget.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                size="md"
                style={{ flex: 1 }}
                type="url"
                value={url}
              />
              <div className={styles.pulseAnchor}>
                {pulseKey > 0 ? <span aria-hidden className={styles.pulse} key={pulseKey} /> : null}
                <Button
                  gradient={{ deg: 135, from: "cyan.7", to: "indigo.7" }}
                  loading={submitting}
                  size="md"
                  style={{ flex: 1 }}
                  type="submit"
                  variant="gradient"
                >
                  {dict.submit}
                </Button>
              </div>
            </Flex>
            {error ? (
              <Alert color="red" title={dict.errorTitle}>
                {error}
              </Alert>
            ) : null}
            <Text c="dimmed" size="xs" ta="center">
              {dict.expectation}
            </Text>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}
