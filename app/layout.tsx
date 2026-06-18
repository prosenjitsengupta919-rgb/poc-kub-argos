import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kube Argos POC",
  description: "A small Next.js app prepared for Kubernetes and Argos visual testing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
