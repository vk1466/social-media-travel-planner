export function KitsPage() {
  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "40px 24px 80px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: "32px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6F73" }}>
          Reference
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "40px", letterSpacing: "-0.03em", fontWeight: 800 }}>
          Wanderfile Kits Architecture
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: "16px", color: "#4A4E52", maxWidth: "700px" }}>
          Two layers: Layer 1 is shared by every saved post. Layer 2 is a kit tailored to the topic (Place, Title, or Recipe). New topics become collections built on a kit, never new nav items.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Layer 1 */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "28px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: "#ECECEA", color: "#4A4E52" }}>
            Layer 1
          </span>
          <h2 style={{ margin: "14px 0 8px", fontSize: "22px", fontWeight: 800 }}>Shared Post Model</h2>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6B6F73" }}>
            Every reel gets these fields regardless of topic.
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "#4A4E52", lineHeight: 1.7 }}>
            <li>Post URL, Platform, Post ID</li>
            <li>Author handle, Posted date, Likes & Comments</li>
            <li>Caption & Hashtags</li>
            <li>Transcript (Supadata)</li>
            <li>Top comments (up to 10)</li>
            <li>Location tag & Thumbnail URL</li>
            <li>Content category (confidence ≥ 60%)</li>
          </ul>
        </section>

        {/* Place Kit */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "28px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: "#E3F0F4", color: "#1B5E78" }}>
            Layer 2 Kit
          </span>
          <h2 style={{ margin: "14px 0 8px", fontSize: "22px", fontWeight: 800 }}>Place Kit (Travel)</h2>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6B6F73" }}>
            Places keep their own page because of the map.
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "#4A4E52", lineHeight: 1.7 }}>
            <li>Identity & Aliases</li>
            <li>Category (15 place categories) & Attributes</li>
            <li>Guidance, About, Tips, Highlights & Caveats</li>
            <li>Location: City, State, Country, Lat/Lng</li>
            <li>Interactive map & Google Maps link</li>
            <li>Mentioned in reels</li>
          </ul>
        </section>

        {/* Title Kit */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "28px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: "#ECE8F7", color: "#4B3C8C" }}>
            Layer 2 Kit
          </span>
          <h2 style={{ margin: "14px 0 8px", fontSize: "22px", fontWeight: 800 }}>Title Kit (Movies & Series)</h2>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6B6F73" }}>
            Dark hero aesthetic matching cinema.
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "#4A4E52", lineHeight: 1.7 }}>
            <li>Movie or TV series classification</li>
            <li>Catalog match (TMDB, IMDb)</li>
            <li>Plot summary & Cast / Director</li>
            <li>Ratings (IMDb rating, Rotten Tomatoes)</li>
            <li>Streaming availability links</li>
          </ul>
        </section>

        {/* Recipe Kit */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "28px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: "#FBEBDD", color: "#9A4513" }}>
            Layer 2 Kit
          </span>
          <h2 style={{ margin: "14px 0 8px", fontSize: "22px", fontWeight: 800 }}>Recipe Kit (Food)</h2>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6B6F73" }}>
            Warm orange hero with interactive cooking tools.
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "#4A4E52", lineHeight: 1.7 }}>
            <li>Servings stepper that scales quantities</li>
            <li>Grouped ingredients with grocery aisle</li>
            <li>Numbered steps with timers</li>
            <li>Equipment and creator tips</li>
            <li>Nutrition per serving or whole recipe</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
