import '@mantine/core/styles.css';
import type { ReactNode } from 'react';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';

export const metadata = {
  title: 'AI App Test — Detector de humo',
  description:
    'Pega un enlace de YouTube o un texto y obtén un informe: índice de hype, desglose del discurso, falacias con citas y timestamps.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
      </body>
    </html>
  );
}
