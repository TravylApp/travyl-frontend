import Navbar from "@/components/navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-11">{children}</main>
    </>
  );
}
