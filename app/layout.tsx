import type { Metadata } from "next";
import { SupabaseAuthBootstrap } from "@/components/jobloop/supabase-auth-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobLoop",
  description: "JobLoop Next.js starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <SupabaseAuthBootstrap />
        {children}
      </body>
    </html>
  );
}
