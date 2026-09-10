import { Link } from "react-router-dom";

import type { Place, SavedPost, VisitDetail } from "../../api";
import { locationLine } from "../display";
import { PageHeading } from "../components/Shell";
import { useLabTheme } from "../theme";

export function HomePage({
  places,
}: {
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
}) {
  const { basePath } = useLabTheme();
  const continuePlace = places[0];

  return (
    <>
      <PageHeading
        kicker="Your library"
        title="Everything you saved, ready when you are."
        lede="Pick a category below. Each one has its own page and URL."
      />
      {continuePlace ? (
        <section className="home-hero">
          <div>
            <p className="eyebrow">Continue planning</p>
            <h2>{continuePlace.display_name}</h2>
            <p>
              {locationLine(continuePlace)}
              {continuePlace.source_post_ids.length
                ? ` · ${continuePlace.source_post_ids.length} saves`
                : ""}
            </p>
            <Link to={`${basePath}/travel/${continuePlace.place_id}`}>Open travel page →</Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
