import { LocateDebugTool } from "./LocateDebugTool";
import { PageHeader } from "./PageHeader";
import { UnresolvedPlacesTool } from "./UnresolvedPlacesTool";

/** Tailwind pilot page — layout utilities share wf brand tokens via tw.css @theme. */
export function AdminPage() {
  return (
    <div className="wf-container wf-page-pad grid gap-5 [&_.wf-page-header]:mb-0">
      <PageHeader
        eyebrow="Internal"
        title="Admin"
        lede="Tools for place pipeline validation."
      />
      <UnresolvedPlacesTool />
      <LocateDebugTool />
    </div>
  );
}
