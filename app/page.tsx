import { Container, Divider, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { CreateAnalysisForm } from "@/components/create-analysis-form";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Veredicto — ¿Qué tan confiable es este video?",
  description:
    "Contrastamos las afirmaciones importantes de un video con fuentes disponibles y explicamos qué conviene revisar antes de decidir."
};

const steps = [
  {
    title: "Pega el enlace",
    detail: "Aceptamos videos públicos de YouTube con subtítulos disponibles."
  },
  {
    title: "Contrastamos con fuentes",
    detail:
      "Extraemos las afirmaciones importantes y las comparamos con evidencia pública. Tarda unos minutos."
  },
  {
    title: "Decide con contexto",
    detail:
      "Recibes un puntaje de alerta, señales de persuasión y consejos concretos antes de actuar."
  }
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <Container size="md" pb="xl" pt={{ base: "xl", sm: 48 }}>
        <Stack gap="xl">
          <div>
            <Title order={1} size="h1">
              Entiende qué tan confiable es un video antes de actuar.
            </Title>
            <Text c="dimmed" fz="lg" mt="md" maw={720}>
              Contrastamos las afirmaciones importantes con fuentes disponibles y explicamos qué
              conviene revisar.
            </Text>
          </div>
          <CreateAnalysisForm />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {steps.map((step, index) => (
              <Paper key={step.title} p="md" radius="md" withBorder>
                <Text c="orange.7" fw={800} size="sm">
                  {index + 1}. {step.title}
                </Text>
                <Text c="dimmed" mt={6} size="sm">
                  {step.detail}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
          <div>
            <Divider mb="md" />
            <Text c="dimmed" size="xs">
              Veredicto analiza el contenido, no juzga a las personas. Los resultados son
              orientativos, dependen de la evidencia pública disponible y no constituyen asesoría
              profesional.
            </Text>
          </div>
        </Stack>
      </Container>
    </>
  );
}
