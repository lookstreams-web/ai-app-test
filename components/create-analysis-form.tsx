"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Divider, Flex, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import type { Dictionary, Locale } from "@/i18n/dictionaries";
import styles from "./create-analysis-form.module.css";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function CreateAnalysisForm({ dict, locale }: { dict: Dictionary["form"]; locale: Locale }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [audioSubmitting, setAudioSubmitting] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const recorder = useVoiceRecorder();

  function goToAnalysis(id: string) {
    router.push(`/analysis/${id}?lang=${locale}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    setPulseKey((key) => key + 1);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceType: "youtube", url, outputLanguage: locale })
      });
      const body = await response.json();
      if (!response.ok || !body.id) throw new Error(body.error?.message ?? dict.defaultError);
      goToAnalysis(body.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.defaultError);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRecording() {
    if (!recorder.blob) return;
    setError(null);
    setAudioSubmitting(true);
    try {
      const form = new FormData();
      const extension = recorder.mimeType?.includes("mp4") ? "mp4" : "webm";
      form.append("audio", recorder.blob, `grabacion.${extension}`);
      form.append("language", locale);
      form.append("outputLanguage", locale);
      const response = await fetch("/api/analyses", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok || !body.id) throw new Error(body.error?.message ?? dict.defaultError);
      goToAnalysis(body.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.defaultError);
      setAudioSubmitting(false);
    }
  }

  const recordingError = recorder.error === "denied"
    ? dict.audio.permissionDenied
    : recorder.error === "unsupported"
      ? dict.audio.unsupported
      : null;

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
          </Stack>
        </form>

        <Divider label={locale === "en" ? "or" : "o"} labelPosition="center" />

        <Stack gap="sm">
          {recorder.state === "recording" ? (
            <Stack align="center" gap="xs">
              <Button color="red" onClick={recorder.stop} variant="light" w={{ base: "100%", sm: "auto" }}>
                {dict.audio.stop}
              </Button>
              <Group gap="xs" wrap="nowrap">
                <span aria-hidden className={styles.recDot} />
                <Text fw={600}>
                  {dict.audio.recording} · {formatElapsed(recorder.elapsedSeconds)}
                </Text>
              </Group>
            </Stack>
          ) : recorder.state === "stopped" ? (
            <Stack gap="xs">
              <Text fw={600} size="sm">
                {dict.audio.reviewTitle} · {formatElapsed(recorder.elapsedSeconds)}
              </Text>
              {recorder.audioUrl ? (
                <audio controls src={recorder.audioUrl} style={{ width: "100%" }} />
              ) : null}
              <Group justify="center">
                <Button
                  gradient={{ deg: 135, from: "cyan.7", to: "indigo.7" }}
                  loading={audioSubmitting}
                  onClick={submitRecording}
                  variant="gradient"
                >
                  {dict.audio.analyze}
                </Button>
                <Button color="gray" disabled={audioSubmitting} onClick={recorder.reset} variant="subtle">
                  {dict.audio.discard}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Button
              color="indigo"
              onClick={() => {
                setError(null);
                void recorder.start();
              }}
              style={{ alignSelf: "center" }}
              variant="light"
              w={{ base: "100%", sm: "auto" }}
            >
              {dict.audio.record}
            </Button>
          )}
          {recordingError ? (
            <Alert color="orange" variant="light">
              {recordingError}
            </Alert>
          ) : null}
          <Text c="dimmed" size="xs" ta="center">
            {dict.audio.note}
          </Text>
        </Stack>

        {error ? (
          <Alert color="red" title={dict.errorTitle}>
            {error}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
