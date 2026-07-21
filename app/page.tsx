import { Container, Divider, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { CreateAnalysisForm } from "@/components/create-analysis-form";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, resolveLocale } from "@/i18n/resolve";

type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };

export async function generateMetadata({ searchParams }: PageProps) {
  const dict = getDictionary(await resolveLocale(await searchParams));
  return { title: dict.home.metaTitle, description: dict.home.metaDescription };
}

export default async function HomePage({ searchParams }: PageProps) {
  const locale = await resolveLocale(await searchParams);
  const dict = getDictionary(locale);
  const home = dict.home;

  return (
    <>
      <SiteHeader dict={dict.header} locale={locale} />
      <Container size="md" pb="xl" pt={{ base: "xl", sm: 48 }}>
        <Stack gap="xl">
          <div>
            <Title order={1} size="h1">
              {home.title}
            </Title>
            <Text c="dimmed" fz="lg" mt="md" maw={720}>
              {home.subtitle}
            </Text>
          </div>
          <CreateAnalysisForm dict={dict.form} locale={locale} />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {home.steps.map((step, index) => (
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
              {home.disclaimer}
            </Text>
          </div>
        </Stack>
      </Container>
    </>
  );
}
