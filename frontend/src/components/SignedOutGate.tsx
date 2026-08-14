import { SignInButton, SignUpButton } from "@clerk/react";

const MOSAIC_PLACES = [
  {
    name: "Kyoto, Japan",
    src: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&h=1200&fit=crop&auto=format&q=70",
  },
  {
    name: "Lisbon, Portugal",
    src: "https://images.unsplash.com/photo-1580323956656-26bbb1206e34?w=700&h=520&fit=crop&auto=format&q=70",
  },
  {
    name: "Cappadocia, Türkiye",
    src: "https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=700&h=520&fit=crop&auto=format&q=70",
  },
  {
    name: "Patagonia, Chile",
    src: "https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=700&h=520&fit=crop&auto=format&q=70",
  },
  {
    name: "Positano, Italy",
    src: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=700&h=520&fit=crop&auto=format&q=70",
  },
] as const;

export function SignedOutGate() {
  return (
    <div className="signed-out-gate">
      <main className="signed-out-copy">
        <div className="signed-out-brand">
          <span className="signed-out-mark" aria-hidden="true">
            W
          </span>
          Wanderfile
        </div>
        <h1 className="signed-out-title">Every reel you saved, finally on a map.</h1>
        <p className="signed-out-sub">
          Sign in to save posts, places, and trips to your library.
        </p>
        <div className="signed-out-actions">
          <SignInButton mode="modal">
            <button type="button" className="primary-button">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="secondary-button">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </main>
      <div className="signed-out-mosaic" aria-hidden="true">
        {MOSAIC_PLACES.map((place, index) => (
          <figure key={place.name}>
            <img src={place.src} alt="" loading={index === 0 ? "eager" : "lazy"} />
            <figcaption>{place.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
