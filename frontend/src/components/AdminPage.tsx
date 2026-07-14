import { LocateDebugTool } from "./LocateDebugTool";
import { UnresolvedPlacesTool } from "./UnresolvedPlacesTool";

export function AdminPage() {
  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>Admin</h1>
        <p>Internal tools for place pipeline validation.</p>
      </header>
      <UnresolvedPlacesTool />
      <LocateDebugTool />
    </div>
  );
}
