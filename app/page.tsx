import {
  Box,
  Card,
  CardSection,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Text,
  Title
} from "@mantine/core";
import { CreateAnalysisForm } from "@/components/create-analysis-form";
import { ScanPulses } from "@/components/scan-pulses";
import { SiteHeader } from "@/components/site-header";
import { StepVisualContrast, StepVisualLink } from "@/components/step-visuals";
import { VerdictPreview } from "@/components/verdict-preview";
import { getDictionary, resolveLocale } from "@/i18n/resolve";
import styles from "./page.module.css";

type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };

// UUID de un análisis real para enlazar desde el preview (pendiente de elegir).
const exampleAnalysisId: string | null = null;

export async function generateMetadata({ searchParams }: PageProps) {
  const dict = getDictionary(await resolveLocale(await searchParams));
  return { title: dict.home.metaTitle, description: dict.home.metaDescription };
}

export default async function HomePage({ searchParams }: PageProps) {
  const locale = await resolveLocale(await searchParams);
  const dict = getDictionary(locale);
  const home = dict.home;
  const exampleHref = exampleAnalysisId
    ? `/analysis/${exampleAnalysisId}?lang=${locale}`
    : undefined;

  const visuals = [
    <StepVisualLink dict={home} key="link" />,
    <StepVisualContrast dict={home} key="contrast" />,
    <VerdictPreview dict={dict.preview} href={exampleHref} key="verdict" />
  ];

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <ScanPulses />
        <div className={styles.navBar}>
          <SiteHeader dict={dict.header} locale={locale} />
        </div>
        <Container size="lg" pb={40} pt={{ base: 40, sm: 72 }}>
          <Title order={1} size="h1" style={{ textWrap: "balance" }} ta="center">
            {home.title}
          </Title>
          <Text c="dimmed" fz="lg" maw={640} mt="md" mx="auto" style={{ textWrap: "balance" }} ta="center">
            {home.subtitle}
          </Text>
          <div className={styles.fadeIn}>
            <Box mt="xl">
              <CreateAnalysisForm dict={dict.form} locale={locale} />
            </Box>
          </div>
        </Container>
      </div>
      <Container component="section" pb="xl" pt={{ base: "xl", sm: 56 }} size="lg">
        <Title mb="lg" order={2} size="h2" ta="center">
          {home.methodology.title}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {home.methodology.items.map((item, index) => (
            <Card className={styles.lift} h="100%" key={item.title} padding="md" radius="md" withBorder>
              <CardSection h={240} withBorder>
                {visuals[index]}
              </CardSection>
              <Group gap="xs" mt="md" wrap="nowrap">
                <span aria-hidden className={styles.stepNumber}>{index + 1}</span>
                <Text fw={600} size="sm">
                  {item.title}
                </Text>
              </Group>
              <Text c="dimmed" mt={6} size="sm">
                {item.detail}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
        <Text c="dimmed" maw={640} mt="xl" mx="auto" size="sm" ta="center">
          <Text component="span" fw={600} inherit>
            {home.methodology.limitsTitle}:{" "}
          </Text>
          {home.methodology.limits}
        </Text>
      </Container>
      <footer className={styles.footer}>
        <Container pb="lg" size="lg">
          <Divider mb="lg" />
          <Group align="center" gap="md" justify="space-between">
            <div>
              <Text c="indigo.7" fw={800}>
                CONTRAST AI
              </Text>
              <Text c="dimmed" size="sm">
                {dict.header.tagline}
              </Text>
            </div>
            <Text c="dimmed" size="xs">
              © {new Date().getFullYear()} Contrast AI
            </Text>
          </Group>
        </Container>
      </footer>
    </div>
  );
}
