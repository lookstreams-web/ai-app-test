"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Divider,
  Group,
  List,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title
} from "@mantine/core";
import { ScanPulses } from "@/components/scan-pulses";
import type { Dictionary } from "@/i18n/dictionaries";

type DashboardDict = Dictionary["dashboard"];

type PublicItem = { texto: string; fuentes: string[] };

type PublicSource = {
  id: string;
  nombre: string;
  enlace: string;
  para_que_la_usamos: string;
};

type SourceMap = Map<string, PublicSource>;

type PublicDiagnosis = {
  diagnostico_final: {
    titular: string;
    puntaje_de_alerta_pct: number | null;
    nivel: string;
    afirmaciones: {
      respaldadas_pct: number;
      incompletas_o_sin_contexto_pct: number;
      incorrectas_segun_fuentes_pct: number;
      sin_comprobar_pct: number;
      explicacion: string;
    };
    posible_manipulacion: {
      contenido_con_senales_pct: number;
      urgencia_o_presion_pct: number;
      senales_principales: string[];
      explicacion: string;
    };
    evidencia_revisada_pct: number;
    estado_de_la_revision: "completa" | "parcial" | "requiere_revision_humana" | "amplia";
    consejo_inmediato: string;
  };
  resumen: {
    en_pocas_palabras: string;
    lo_que_aporta: PublicItem[];
    ten_cuidado_con: PublicItem[];
    no_pudimos_comprobar: PublicItem[];
  };
  contenido_del_video: {
    venta_o_promocion_pct: number;
    informacion_util_pct: number;
    informacion_util_con_respaldo_pct: number;
    urgencia_o_presion_pct: number;
    explicacion: string;
  };
  contrastes: Array<{
    dice: string;
    encontramos: string;
    conclusion: string;
    explicacion: string;
    momento_del_video: string;
    fuentes: string[];
  }>;
  contexto_publico: {
    que_revisamos: string[];
    lo_positivo_comprobado: PublicItem[];
    alertas_comprobadas: PublicItem[];
    comentarios_que_solo_son_opiniones: PublicItem[];
    explicacion: string;
  };
  consejo: {
    recomendacion_principal: string;
    por_que: string;
    antes_de_decidir: string[];
    preguntas_que_puedes_hacer: string[];
  };
  fuentes_principales: PublicSource[];
  avisos: string[];
};

type AnalysisSource = {
  url: string;
  title: string;
  channel: {
    name: string;
    url: string | null;
  };
};

type Snapshot = {
  status: string;
  progress: number;
  source: AnalysisSource | null;
  result: PublicDiagnosis | null;
  error: { message: string } | null;
};

const pending = new Set([
  "queued",
  "leased",
  "analyzing",
  "researching",
  "adjudicating",
  "scoring",
  "synthesizing"
]);

const levelColors: Record<string, string> = {
  bajo: "green",
  moderado: "yellow",
  medio: "yellow",
  precaucion_media: "yellow",
  alto: "orange",
  "muy alto": "red",
  sin_conclusion: "gray"
};

const conclusionColors: Record<string, string> = {
  coincide: "green",
  coincide_en_parte: "teal",
  falta_contexto: "yellow",
  hay_desacuerdo_entre_fuentes: "orange",
  no_coincide: "red",
  no_se_pudo_comprobar: "gray",
  todavia_no_se_puede_saber: "gray"
};

function timestampUrl(sourceUrl: string, timestamp: string): string | null {
  const match = /^(\d{2,}):(\d{2})$/.exec(timestamp);
  if (!match) return null;
  try {
    const url = new URL(sourceUrl);
    url.searchParams.set("t", `${Number(match[1]) * 60 + Number(match[2])}s`);
    return url.toString();
  } catch {
    return null;
  }
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function label(map: Record<string, string>, value: string) {
  return map[value] ?? humanize(value);
}

function Metric({ label: name, value, color }: { label: string; value: number; color: string }) {
  return (
    <Stack gap={5}>
      <Group justify="space-between">
        <Text fw={600} size="sm">
          {name}
        </Text>
        <Text fw={700} size="sm">
          {value}%
        </Text>
      </Group>
      <Progress color={color} value={value} />
    </Stack>
  );
}

function SourceLinks({
  ids,
  sources,
  dict
}: {
  ids: string[];
  sources: SourceMap;
  dict: DashboardDict;
}) {
  const resolved = [...new Set(ids)]
    .map((id) => sources.get(id))
    .filter((source): source is PublicSource => Boolean(source));
  if (!resolved.length) return null;
  return (
    <Group gap="xs">
      {resolved.map((source, index) => (
        <Anchor href={source.enlace} key={source.id} rel="noreferrer" size="xs" target="_blank">
          {dict.viewSource}
          {resolved.length > 1 ? ` ${index + 1}` : ""}
        </Anchor>
      ))}
    </Group>
  );
}

function SourceInfo({ source, dict }: { source: AnalysisSource | null; dict: DashboardDict }) {
  if (!source) return null;
  return (
    <div>
      <Text c="dimmed" fw={700} size="xs" tt="uppercase">
        {dict.sourceLabel}
      </Text>
      <Anchor
        c="inherit"
        fw={700}
        fz="xl"
        href={source.url}
        rel="noreferrer"
        target="_blank"
        underline="hover"
      >
        {source.title}
      </Anchor>
      {source.channel.url ? (
        <Anchor
          c="dimmed"
          display="block"
          href={source.channel.url}
          rel="noreferrer"
          size="sm"
          target="_blank"
        >
          {source.channel.name}
        </Anchor>
      ) : (
        <Text c="dimmed" size="sm">
          {source.channel.name}
        </Text>
      )}
    </div>
  );
}

function InsightCard({
  title,
  items,
  color,
  sources,
  dict
}: {
  title: string;
  items: PublicItem[];
  color: string;
  sources: SourceMap;
  dict: DashboardDict;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text c={color} fw={700} mb="sm">
        {title}
      </Text>
      {items.length ? (
        <List spacing="xs" size="sm">
          {items.map((item) => (
            <List.Item key={item.texto}>
              {item.texto}
              <SourceLinks dict={dict} ids={item.fuentes} sources={sources} />
            </List.Item>
          ))}
        </List>
      ) : (
        <Text c="dimmed" size="sm">
          {dict.emptyCategory}
        </Text>
      )}
    </Paper>
  );
}

export function AnalysisDashboard({ id, dict }: { id: string; dict: DashboardDict }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const response = await fetch(`/api/analyses/${id}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? dict.queryError);
        if (!active) return;
        setSnapshot(body);
        setNetworkError(null);
        if (pending.has(body.status)) timer = setTimeout(load, 2000);
      } catch (caught) {
        if (active) {
          setNetworkError(caught instanceof Error ? caught.message : dict.queryError);
        }
      }
    }

    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, dict]);

  if (networkError) {
    return (
      <Alert color="red" title={dict.loadErrorTitle}>
        {networkError}
      </Alert>
    );
  }

  if (!snapshot) {
    return (
      <>
        <ScanPulses />
        <Stack gap="lg">
          <div>
            <Skeleton height={10} width={96} />
            <Skeleton height={22} mt={10} width="45%" />
            <Skeleton height={14} mt={10} width={140} />
          </div>
          <Skeleton height={240} radius="lg" />
        </Stack>
      </>
    );
  }

  if (snapshot.status === "failed") {
    return (
      <Stack gap="lg">
        <SourceInfo dict={dict} source={snapshot.source} />
        <Alert color="red" title={dict.failedTitle}>
          {snapshot.error?.message ?? dict.failedFallback}
        </Alert>
      </Stack>
    );
  }

  if (!snapshot.result) {
    return (
      <>
        <ScanPulses />
        <Stack gap="lg">
          <SourceInfo dict={dict} source={snapshot.source} />
          <Paper withBorder p="xl" radius="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={700}>{dict.preparingTitle}</Text>
                  <Text c="dimmed" size="sm">
                    {dict.stages[snapshot.status] ?? snapshot.status}
                  </Text>
                </div>
                <Badge color="indigo" variant="light">
                  {snapshot.progress}%
                </Badge>
              </Group>
              <Progress animated value={snapshot.progress} />
            </Stack>
          </Paper>
        </Stack>
      </>
    );
  }

  const result = snapshot.result;
  const diagnosis = result.diagnostico_final;
  const manipulation = diagnosis.posible_manipulacion;
  const composition = result.contenido_del_video;
  const publicContext = result.contexto_publico;
  const sources: SourceMap = new Map(
    result.fuentes_principales.map((source) => [source.id, source])
  );
  const provisional = diagnosis.estado_de_la_revision === "parcial";
  const contextCards = [
    { title: dict.contextPositive, color: "green", items: publicContext.lo_positivo_comprobado },
    { title: dict.contextAlerts, color: "orange", items: publicContext.alertas_comprobadas },
    {
      title: dict.contextOpinions,
      color: "gray",
      items: publicContext.comentarios_que_solo_son_opiniones
    }
  ].filter((card) => card.items.length > 0);
  const hasPublicContext = contextCards.length > 0;
  const claims = diagnosis.afirmaciones;
  const allClaimsUnverified =
    claims.respaldadas_pct === 0 &&
    claims.incompletas_o_sin_contexto_pct === 0 &&
    claims.incorrectas_segun_fuentes_pct === 0 &&
    claims.sin_comprobar_pct > 0;

  return (
    <Stack gap="xl">
      <SourceInfo dict={dict} source={snapshot.source} />
      {diagnosis.estado_de_la_revision === "requiere_revision_humana" ? (
        <Alert color="red" title={dict.humanReviewTitle}>
          {dict.humanReviewBody}
        </Alert>
      ) : null}

      <Paper bg="dark.8" p={{ base: "lg", sm: "xl" }} radius="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Badge color={levelColors[diagnosis.nivel] ?? "gray"} variant="filled">
              {label(dict.levels, diagnosis.nivel)}
            </Badge>
            <Text c="gray.3" size="sm">
              {diagnosis.evidencia_revisada_pct}
              {dict.evidenceReviewedSuffix}
            </Text>
          </Group>
          <Title c="white" order={1}>
            {diagnosis.titular}
          </Title>
          <Text c="gray.3" maw={760}>
            {result.resumen.en_pocas_palabras}
          </Text>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper withBorder p="lg" radius="lg">
          <Group gap="xs">
            <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
              {dict.scoreTitle}
            </Text>
            {provisional ? (
              <Badge color="yellow" size="sm" variant="light">
                {dict.provisionalBadge}
              </Badge>
            ) : null}
          </Group>
          {diagnosis.puntaje_de_alerta_pct === null ? (
            <>
              <Text fw={700} fz={40} mt="xs">
                {dict.noScore}
              </Text>
              <Text c="dimmed" size="sm">
                {dict.noScoreNote}
              </Text>
              {provisional ? (
                <Text c="dimmed" mt="xs" size="xs">
                  {dict.provisionalNote}
                </Text>
              ) : null}
              <Text mt="xs">{diagnosis.consejo_inmediato}</Text>
            </>
          ) : (
            <Group align="center" gap="lg" mt="md">
              <RingProgress
                label={
                  <Stack align="center" gap={0}>
                    <Text fw={800} fz={38} lh={1}>
                      {diagnosis.puntaje_de_alerta_pct}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {dict.scoreOutOf}
                    </Text>
                  </Stack>
                }
                roundCaps
                sections={[
                  {
                    value: diagnosis.puntaje_de_alerta_pct,
                    color: levelColors[diagnosis.nivel] ?? "gray"
                  }
                ]}
                size={160}
                thickness={14}
              />
              <Stack gap="xs" style={{ flex: 1, minWidth: 220 }}>
                {provisional ? (
                  <Text c="dimmed" size="xs">
                    {dict.provisionalNote}
                  </Text>
                ) : null}
                <Text>{diagnosis.consejo_inmediato}</Text>
              </Stack>
            </Group>
          )}
        </Paper>

        <Paper withBorder p="lg" radius="lg">
          <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
            {dict.claimsTitle}
          </Text>
          <Stack gap="sm" mt="md">
            {allClaimsUnverified ? (
              <Metric color="gray" label={dict.claimUnverified} value={claims.sin_comprobar_pct} />
            ) : (
              <>
                <Metric color="green" label={dict.claimSupported} value={claims.respaldadas_pct} />
                <Metric
                  color="yellow"
                  label={dict.claimNoContext}
                  value={claims.incompletas_o_sin_contexto_pct}
                />
                <Metric
                  color="red"
                  label={dict.claimMismatch}
                  value={claims.incorrectas_segun_fuentes_pct}
                />
                <Metric color="gray" label={dict.claimUnverified} value={claims.sin_comprobar_pct} />
              </>
            )}
          </Stack>
          <Text c="dimmed" mt="md" size="xs">
            {claims.explicacion}
          </Text>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper withBorder p="lg" radius="lg">
          <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
            {dict.signalsTitle}
          </Text>
          <Stack gap="sm" mt="md">
            <Metric
              color="orange"
              label={dict.signalContent}
              value={manipulation.contenido_con_senales_pct}
            />
            <Metric
              color="orange"
              label={dict.signalUrgency}
              value={manipulation.urgencia_o_presion_pct}
            />
          </Stack>
          {manipulation.senales_principales.length ? (
            <Group gap="xs" mt="md">
              {manipulation.senales_principales.map((signal) => (
                <Badge color="gray" key={signal} variant="light">
                  {label(dict.techniques, signal)}
                </Badge>
              ))}
            </Group>
          ) : null}
          <Text c="dimmed" mt="md" size="xs">
            {manipulation.explicacion}
          </Text>
        </Paper>

        <Paper withBorder p="lg" radius="lg">
          <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
            {dict.compositionTitle}
          </Text>
          <Stack gap="sm" mt="md">
            <Metric
              color="indigo"
              label={dict.compositionPromotion}
              value={composition.venta_o_promocion_pct}
            />
            <Metric
              color="indigo"
              label={dict.compositionUseful}
              value={composition.informacion_util_pct}
            />
            <Metric
              color="indigo"
              label={dict.compositionBacked}
              value={composition.informacion_util_con_respaldo_pct}
            />
            <Metric
              color="indigo"
              label={dict.compositionUrgency}
              value={composition.urgencia_o_presion_pct}
            />
          </Stack>
          <Text c="dimmed" mt="md" size="xs">
            {composition.explicacion}
          </Text>
        </Paper>
      </SimpleGrid>

      <div>
        <Title order={2}>{dict.foundTitle}</Title>
        <SimpleGrid cols={{ base: 1, md: 3 }} mt="md">
          <InsightCard
            color="green"
            dict={dict}
            items={result.resumen.lo_que_aporta}
            sources={sources}
            title={dict.cardContributes}
          />
          <InsightCard
            color="orange"
            dict={dict}
            items={result.resumen.ten_cuidado_con}
            sources={sources}
            title={dict.cardCareful}
          />
          <InsightCard
            color="gray"
            dict={dict}
            items={result.resumen.no_pudimos_comprobar}
            sources={sources}
            title={dict.cardUnverified}
          />
        </SimpleGrid>
      </div>

      {result.contrastes.length ? (
        <div>
          <Title order={2}>{dict.contrastTitle}</Title>
          <Text c="dimmed" mt={4}>
            {dict.contrastSubtitle}
          </Text>
          <Stack mt="md">
            {result.contrastes.map((contrast) => {
              const momentUrl = snapshot.source
                ? timestampUrl(snapshot.source.url, contrast.momento_del_video)
                : null;
              return (
                <Paper
                  key={`${contrast.momento_del_video}-${contrast.dice}`}
                  withBorder
                  p="lg"
                  radius="md"
                >
                  <Group justify="space-between" mb="md">
                    <Badge color={conclusionColors[contrast.conclusion] ?? "gray"}>
                      {label(dict.conclusions, contrast.conclusion)}
                    </Badge>
                    {momentUrl ? (
                      <Anchor c="dimmed" href={momentUrl} rel="noreferrer" size="sm" target="_blank">
                        {contrast.momento_del_video}
                      </Anchor>
                    ) : (
                      <Text c="dimmed" size="sm">
                        {contrast.momento_del_video}
                      </Text>
                    )}
                  </Group>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <div>
                      <Text c="dimmed" size="xs" fw={700}>
                        {dict.videoSays}
                      </Text>
                      <Text fw={600}>&ldquo;{contrast.dice}&rdquo;</Text>
                    </div>
                    <div>
                      <Text c="dimmed" size="xs" fw={700}>
                        {dict.weFound}
                      </Text>
                      <Text>{contrast.encontramos}</Text>
                    </div>
                  </SimpleGrid>
                  {contrast.explicacion !== contrast.encontramos ? (
                    <Text c="dimmed" mt="md" size="sm">
                      {contrast.explicacion}
                    </Text>
                  ) : null}
                  <SourceLinks dict={dict} ids={contrast.fuentes} sources={sources} />
                </Paper>
              );
            })}
          </Stack>
        </div>
      ) : null}

      {hasPublicContext ? (
        <div>
          <Title order={2}>{dict.contextTitle}</Title>
          {publicContext.que_revisamos.length ? (
            <Text c="dimmed" mt="xs" size="sm">
              {dict.contextReviewed}{" "}
              {publicContext.que_revisamos
                .map((place) => place.replaceAll("_", " "))
                .join(" · ")}
            </Text>
          ) : null}
          <SimpleGrid cols={{ base: 1, md: contextCards.length }} mt="md">
            {contextCards.map((card) => (
              <InsightCard
                color={card.color}
                dict={dict}
                items={card.items}
                key={card.title}
                sources={sources}
                title={card.title}
              />
            ))}
          </SimpleGrid>
          <Text c="dimmed" mt="md" size="xs">
            {publicContext.explicacion}
          </Text>
        </div>
      ) : null}

      <Paper withBorder p="lg" radius="lg">
        <Title order={2}>{dict.adviceTitle}</Title>
        <Text mt="xs">{result.consejo.recomendacion_principal}</Text>
        <Text c="dimmed" mt="xs">
          {result.consejo.por_que}
        </Text>
        <List mt="md">
          {result.consejo.antes_de_decidir.map((advice) => (
            <List.Item key={advice}>{advice}</List.Item>
          ))}
        </List>
        {result.consejo.preguntas_que_puedes_hacer.length ? (
          <>
            <Text fw={600} mt="md">
              {dict.questionsTitle}
            </Text>
            <List mt="xs">
              {result.consejo.preguntas_que_puedes_hacer.map((question) => (
                <List.Item key={question}>{question}</List.Item>
              ))}
            </List>
          </>
        ) : null}
      </Paper>

      {result.fuentes_principales.length ? (
        <div>
          <Divider mb="md" />
          <Title order={3}>{dict.sourcesTitle}</Title>
          <Stack gap="xs" mt="sm">
            {result.fuentes_principales.map((source) => (
              <Anchor href={source.enlace} key={source.id} rel="noreferrer" target="_blank">
                {source.nombre} &mdash; {source.para_que_la_usamos}
              </Anchor>
            ))}
          </Stack>
        </div>
      ) : null}

      {result.avisos.length ? (
        <Stack gap={4}>
          {result.avisos.map((notice) => (
            <Text c="dimmed" key={notice} size="xs">
              {notice}
            </Text>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
