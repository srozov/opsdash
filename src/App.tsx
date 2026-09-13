import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout.tsx";
import { DashboardPage } from "./routes/DashboardPage.tsx";
import { WorkflowsPage } from "./routes/WorkflowsPage.tsx";
import { WorkflowExecutionPage } from "./routes/WorkflowExecutionPage.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="workflows/runs/:runId" element={<WorkflowExecutionPage />} />
      </Route>
    </Routes>
  );
}
