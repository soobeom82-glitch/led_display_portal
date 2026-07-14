import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tesla Personal Display",
  description:
    "Ambient display MVP for showing Tesla charging state on an LED display or browser preview.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
