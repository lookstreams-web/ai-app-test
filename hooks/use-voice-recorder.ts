"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Envuelve `MediaRecorder` para grabar la voz del usuario desde el navegador.
 * Estados: idle → recording → stopped, o denied si falla el permiso/soporte.
 * Cronómetro y límite duro configurable (30 min por defecto). El blob final se
 * envía como FormData al endpoint de análisis.
 */

export type RecorderState = "idle" | "recording" | "stopped" | "denied";
export type RecorderError = "denied" | "unsupported" | null;

export const MAX_RECORDING_SECONDS = 30 * 60;

export interface VoiceRecorder {
  state: RecorderState;
  elapsedSeconds: number;
  blob: Blob | null;
  audioUrl: string | null;
  mimeType: string | null;
  error: RecorderError;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// webm/opus es lo preferido; audio/mp4 es el fallback de Safari/WebKit.
function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function useVoiceRecorder(maxSeconds = MAX_RECORDING_SECONDS): VoiceRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [error, setError] = useState<RecorderError>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    clearTimer();
  }, [clearTimer]);

  const start = useCallback(async () => {
    setError(null);
    const type = pickMimeType();
    if (!navigator.mediaDevices?.getUserMedia || !type) {
      setError("unsupported");
      setState("denied");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("denied");
      setState("denied");
      return;
    }

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setAudioUrl(null);
    }
    streamRef.current = stream;
    chunksRef.current = [];
    setBlob(null);
    setElapsed(0);
    setMimeType(type);

    const recorder = new MediaRecorder(stream, { mimeType: type });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const finalBlob = new Blob(chunksRef.current, { type });
      setBlob(finalBlob);
      const url = URL.createObjectURL(finalBlob);
      urlRef.current = url;
      setAudioUrl(url);
      stopStream();
      setState("stopped");
    };
    recorder.start();
    setState("recording");
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxSeconds) stop();
        return next;
      });
    }, 1000);
  }, [maxSeconds, stop, stopStream]);

  const reset = useCallback(() => {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    stopStream();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setBlob(null);
    setAudioUrl(null);
    setMimeType(null);
    setElapsed(0);
    setError(null);
    setState("idle");
  }, [clearTimer, stopStream]);

  useEffect(
    () => () => {
      clearTimer();
      stopStream();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [clearTimer, stopStream]
  );

  return { state, elapsedSeconds, blob, audioUrl, mimeType, error, start, stop, reset };
}
