import { LocateDebugTool } from "./LocateDebugTool";
import { PageHeading } from "./PageHeading";
import { UnresolvedPlacesTool } from "./UnresolvedPlacesTool";

/** Tailwind pilot page — layout utilities share wf brand tokens via tw.css @theme. */
export function AdminPage() {
  return (
    <div className="grid gap-5 [&_.page-heading]:mb-0">
      <PageHeading
        kicker="Internal"
        title="Admin"
        lede="Tools for place pipeline validation."
        count={{ value: 2, label: "tools" }}
        platformFilter={false}
      />
      <UnresolvedPlacesTool />
      <LocateDebugTool />
    </div>
  );
}
