import { cookies } from "next/headers";
import { LoginScreen } from "@/components/LoginScreen";
import { StaffDashboard } from "@/components/StaffDashboard";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export default async function Page() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(AUTH_COOKIE_NAME)?.value === "authenticated";

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <StaffDashboard />;
}
