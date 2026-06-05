import { Inter, Playfair_Display, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-report",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "AssignAI — Premium Academic Report Generator",
  description: "Generate professional, AI-powered academic reports with pixel-perfect SIT VTU formatting. Powered by NVIDIA Llama 3 and AssignAI Engine, grounded in real facts.",
  keywords: "assignment generator, academic report, AI, SIT VTU, NVIDIA, Llama 3",
};

import Scene from '@/components/Scene';

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${sourceSerif.variable}`}>
        <Scene />
        {children}
      </body>
    </html>
  );
}
