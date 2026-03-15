import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Project — Retrack",
  description: "View this project's progress board",
  openGraph: {
    title: "Public Project — Retrack",
    description: "View this project's progress board",
  },
};

export default function PublicProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
