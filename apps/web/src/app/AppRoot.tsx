import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "./auth/AuthGate";
import { Dashboard } from "./dashboard/Dashboard";
import { api } from "../lib/api";

export function AppRoot() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false
  });

  if (me.isLoading) {
    return <div className="center-note">Checking session...</div>;
  }

  if (me.isError) {
    return <AuthGate />;
  }

  return <Dashboard />;
}
