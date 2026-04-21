import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTriage — AI-Powered Emergency Room Triage",
  description:
    "Cascading LLM → ML → LLM triage system. Type raw patient vitals, get instant risk classification and clinical rationale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-parchment text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
