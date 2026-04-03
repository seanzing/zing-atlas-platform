import Sidebar from "@/components/Sidebar";
import SWRProvider from "@/components/SWRProvider";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Z } from "@/lib/constants";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <AuthProvider>
        <div
          style={{
            display: "flex",
            height: "100vh",
            background: Z.bg,
            color: Z.textPrimary,
            overflow: "hidden",
          }}
        >
          <Sidebar />
          <div style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </AuthProvider>
    </SWRProvider>
  );
}
