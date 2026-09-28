import { SignInButton, SignUpButton } from "@clerk/react";

const previewItems = [
  { category: "Travel / Italy", title: "A slower week on the Amalfi Coast", source: "Instagram", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&h=1100&fit=crop&auto=format&q=80" },
  { category: "Food / At home", title: "The Sunday pasta you’ll make again", source: "Recipe", image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&h=1100&fit=crop&auto=format&q=80" },
  { category: "Places / Japan", title: "A little café in Kyoto", source: "Video", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&h=1100&fit=crop&auto=format&q=80" },
] as const;

export function SignedOutGate() {
  return (
    <div className="signed-out-gate">
      <div className="signed-out-announcement">A home for all the things you want to come back to <span aria-hidden="true">✳</span></div>
      <header className="signed-out-nav">
        <a className="signed-out-brand" href="#top" aria-label="Wanderfile home"><span className="signed-out-mark" aria-hidden="true">✳</span>Wanderfile</a>
        <nav aria-label="Page navigation"><a href="#how-it-works">How it works</a><a href="#your-library">Your library</a></nav>
        <SignInButton mode="modal" forceRedirectUrl="/"><button type="button" className="signed-out-nav-action">Sign in <span aria-hidden="true">↗</span></button></SignInButton>
      </header>
      <main id="top">
        <section className="signed-out-hero" aria-labelledby="signed-out-title">
          <div className="signed-out-hero-copy">
            <p className="signed-out-eyebrow"><span aria-hidden="true">✳</span> YOUR SECOND MEMORY</p>
            <h1 id="signed-out-title">Save the good stuff.<br /><em>Find it again.</em></h1>
            <p className="signed-out-sub">That place, recipe, film, or idea you found online? Give it a home. Wanderfile turns your saved links into a library that makes sense.</p>
            <div className="signed-out-actions">
              <SignUpButton mode="modal" forceRedirectUrl="/"><button type="button" className="signed-out-primary">Start your library <span aria-hidden="true">↗</span></button></SignUpButton>
              <a href="#how-it-works" className="signed-out-text-link">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <p className="signed-out-small-note">One link is all it takes to begin.</p>
          </div>
          <div className="signed-out-hero-art" aria-label="Preview of an organized Wanderfile library">
            <div className="signed-out-orbit signed-out-orbit-one" aria-hidden="true" /><div className="signed-out-orbit signed-out-orbit-two" aria-hidden="true" />
            <div className="signed-out-floating-label signed-out-label-top">Ideas, finally in one place <span>✳</span></div>
            <div className="signed-out-preview">
              <div className="signed-out-preview-top"><span><span className="signed-out-preview-mark">✳</span> wanderfile</span><span>YOUR LIBRARY ↗</span></div>
              <div className="signed-out-preview-heading">Everything you love,<br /><em>beautifully kept.</em></div>
              <div className="signed-out-preview-tabs"><span className="is-selected">All saves</span><span>Travel</span><span>Food</span><span>Movies</span></div>
              <div className="signed-out-preview-grid">{previewItems.map((item) => <div className="signed-out-preview-card" key={item.title}><img src={item.image} alt="" loading="lazy" /><div><span>{item.category}</span><strong>{item.title}</strong><small>Saved from {item.source}</small></div></div>)}</div>
            </div>
            <div className="signed-out-floating-label signed-out-label-bottom"><span className="signed-out-label-icon">✓</span> Saved & sorted for you</div>
          </div>
        </section>
        <section className="signed-out-how" id="how-it-works" aria-labelledby="signed-out-how-title">
          <div className="signed-out-section-intro"><span>01 / THE SIMPLE PART</span><h2 id="signed-out-how-title">From “I should save this”<br />to <em>“there it is.”</em></h2></div>
          <div className="signed-out-steps">
            <div><span className="signed-out-step-number">01</span><span className="signed-out-step-icon" aria-hidden="true">↗</span><h3>Drop in a link</h3><p>Save a post, video, or article whenever something catches your eye.</p></div>
            <div><span className="signed-out-step-number">02</span><span className="signed-out-step-icon" aria-hidden="true">✳</span><h3>Let it find its place</h3><p>Wanderfile organizes it with the rest of your ideas, across every topic.</p></div>
            <div><span className="signed-out-step-number">03</span><span className="signed-out-step-icon" aria-hidden="true">⌕</span><h3>Come back inspired</h3><p>Find what you saved when you’re ready to cook, watch, go, or do.</p></div>
          </div>
        </section>
        <section className="signed-out-bottom" id="your-library"><span className="signed-out-bottom-doodle" aria-hidden="true">✳</span><p>GOOD IDEAS DESERVE A PLACE TO LIVE</p><h2>A little less scrolling.<br /><em>A lot more doing.</em></h2><SignUpButton mode="modal" forceRedirectUrl="/"><button type="button" className="signed-out-primary">Start your library <span aria-hidden="true">↗</span></button></SignUpButton></section>
      </main>
      <footer className="signed-out-footer"><span>✳ Wanderfile</span><span>Keep what moves you.</span></footer>
    </div>
  );
}
