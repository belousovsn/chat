import { jsx as _jsx } from "react/jsx-runtime";
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
        return _jsx("div", { className: "center-note", children: "Checking session..." });
    }
    if (me.isError) {
        return _jsx(AuthGate, {});
    }
    return _jsx(Dashboard, {});
}
//# sourceMappingURL=AppRoot.js.map