import type { Metadata } from "next";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/500.css";
import "@fontsource/lora/400-italic.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "./globals.css";
import { portfolio } from "@/lib/portfolio";
export const metadata: Metadata = {
  openGraph: {
    title: `Forest Village — ${portfolio.name}`,
    description:
      "Sunil Kumawat · Full Stack Developer. Explore my work, skills, and experience in Forest Village.",
    type: "website",
  },
  title: `Forest Village — ${portfolio.name}`,
  description:
    "Sunil Kumawat’s full stack developer portfolio: React, Next.js, Node.js, PostgreSQL, professional experience, and contact details in an interactive Forest Village.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions (dark-mode/theme injectors) add dir/data-theme attributes
    // to <html> before hydration; suppress that one-level attribute mismatch.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
