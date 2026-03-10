import { FloatingNavbar } from "@/components/FloatingNavbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FloatingNavbar />
      <main>{children}</main>
    </>
  );
}
