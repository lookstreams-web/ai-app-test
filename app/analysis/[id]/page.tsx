import { Container } from "@mantine/core";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Veredicto — Diagnóstico del video"
};

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SiteHeader showNewAnalysis />
      <Container size="lg" pb={64} pt="md">
        <AnalysisDashboard id={id} />
      </Container>
    </>
  );
}
