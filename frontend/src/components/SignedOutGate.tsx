import { SignInButton, SignUpButton } from "@clerk/react";

const MOSAIC_ITEMS = [
  {
    name: "Weeknight recipes",
    src: "https://images.unsplash.com/photo-1547592180-85f173990554?w=900&h=1200&fit=crop&auto=format&q=70",
  },
  {
    name: "Movies to watch",
    src: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&h=520&fit=crop&auto=format&q=70",
  },
  {
    name: "Style ideas",
    src: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&h=520&fit=crop&auto=format&q=70",
  },
  {
    name: "Places to try",
    src: "https://images.unsplash.com/photo-1580323956656-26bbb1206e34?w=700&h=520&fit=crop&auto=format&q=70",
  },
  {
    name: "Home inspiration",
    src: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=700&h=520&fit=crop&auto=format&q=70",
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
        <h1 className="signed-out-title">Everything you save, organized automatically.</h1>
        <p className="signed-out-sub">
          Turn reels, posts, videos, and articles into a useful, searchable library.
        </p>
        <div className="signed-out-actions">
          <SignInButton mode="modal" forceRedirectUrl="/">
            <button type="button" className="primary-button">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/">
            <button type="button" className="secondary-button">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </main>
      <div className="signed-out-mosaic" aria-hidden="true">
        {MOSAIC_ITEMS.map((item, index) => (
          <figure key={item.name}>
            <img src={item.src} alt="" loading={index === 0 ? "eager" : "lazy"} />
            <figcaption>{item.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
