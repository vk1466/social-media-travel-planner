import { SignInButton, SignUpButton } from "@clerk/react";

const collageImages = [
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=700&h=900&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=700&h=900&fit=crop&auto=format&q=80",
];

export function SignedOutGate() {
  return (
    <div className="wf-signed-out-container">
      {/* Blurred 8px Travel Reel Collage Background */}
      <div className="wf-signed-out-collage" aria-hidden="true">
        {collageImages.map((src, i) => (
          <div key={i} className="wf-signed-out-tile">
            <img src={src} alt="" loading="lazy" />
          </div>
        ))}
      </div>

      {/* Dark Scrim */}
      <div className="wf-signed-out-scrim" />

      {/* Centered Modal / Card */}
      <div className="wf-signed-out-card">
        {/* Brand Header */}
        <div className="wf-signed-out-brand">
          <div className="wf-signed-out-mark">W</div>
          <span className="wf-signed-out-brand-text">Wanderfile</span>
        </div>

        {/* Value Prop */}
        <h1 className="wf-signed-out-title">
          Turn saved reels into a map you'll actually use.
        </h1>

        <p className="wf-signed-out-sub">
          Paste any Instagram reel recommendation. Wanderfile organizes every spot, city, and tip into an uncluttered personal travel map.
        </p>

        {/* Action Buttons */}
        <div className="wf-signed-out-actions">
          <SignUpButton mode="modal" forceRedirectUrl="/">
            <button type="button" className="wf-signed-out-primary-btn">
              Get started — it's free
            </button>
          </SignUpButton>

          <SignInButton mode="modal" forceRedirectUrl="/">
            <button type="button" className="wf-signed-out-secondary-btn">
              Sign in to your library
            </button>
          </SignInButton>
        </div>

        {/* Feature Pills */}
        <div className="wf-signed-out-perks">
          <span>🗺️ POI-free minimal map</span>
          <span>⚡ Auto spot extraction</span>
          <span>📱 Works on mobile & web</span>
        </div>
      </div>
    </div>
  );
}
