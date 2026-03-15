import { Navbar } from "./_components/Navbar";
import { Footer } from "./_components/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="light" style={{ colorScheme: 'light' }}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
