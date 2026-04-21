import { createBrowserRouter } from "react-router-dom";
import { AppRoot } from "./AppRoot";
import { OldschoolPreview } from "./design/OldschoolPreview";

export const router = createBrowserRouter([
  {
    path: "/design/oldschool-preview",
    element: <OldschoolPreview />
  },
  {
    path: "*",
    element: <AppRoot />
  }
]);
