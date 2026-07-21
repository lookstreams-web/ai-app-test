import { Container } from "@mantine/core";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, resolveLocale } from "@/i18n/resolve";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const dict = getDictionary(await resolveLocale(await searchParams));
  return { title: dict.dashboard.metaTitle };
}

export default async function AnalysisPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const locale = await resolveLocale(await searchParams);
  const dict = getDictionary(locale);

  return (
    <>
      <SiteHeader dict={dict.header} locale={locale} showNewAnalysis />
      <Container size="lg" pb={64} pt="md">
        <AnalysisDashboard dict={dict.dashboard} id={id} />
      </Container>
    </>
  );
}
