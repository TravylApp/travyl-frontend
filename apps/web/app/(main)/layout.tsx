import { Suspense } from "react";
import Navbar from "@/components/navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <main className="pt-16 bg-background text-foreground transition-colors duration-500">{children}</main>
    </>
  );
}
