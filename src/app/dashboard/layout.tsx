export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, borderRight: "1px solid #e5e5e5", padding: "1rem" }}>
        <h2>Retrack</h2>
        <nav>
          <ul>
            <li><a href="/dashboard">Projects</a></li>
            <li><a href="/dashboard/settings">Settings</a></li>
            <li><a href="/dashboard/billing">Billing</a></li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1rem" }}>{children}</main>
    </div>
  );
}
