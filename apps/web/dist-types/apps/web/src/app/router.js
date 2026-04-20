import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from "react-router-dom";
import { AppRoot } from "./AppRoot";
export const router = createBrowserRouter([
    {
        path: "*",
        element: _jsx(AppRoot, {})
    }
]);
//# sourceMappingURL=router.js.map