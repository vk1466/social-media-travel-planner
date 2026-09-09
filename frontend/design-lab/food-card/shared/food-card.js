const icons = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3 1.8"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 18.5c.5-3 2.1-4.5 5-4.5s4.5 1.5 5 4.5M14 14c3.7-.3 5.8 1.2 6.2 4.5"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l-1 11H6l-1-11Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11v15l-5.5-3-5.5 3v-15Z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z"/></svg>',
};

const recipes = [
  {
    title: "Crispy chili garlic noodles",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=88",
    creator: "@thefeedfeed",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    time: "25 min",
    difficulty: "Easy",
    meal: "Dinner",
    cuisine: "Chinese-inspired",
    ingredients: 11,
    servings: 4,
    calories: 480,
    protein: 19,
    carbs: 58,
    fat: 18,
    diet: "Vegetarian",
    note: "Weeknight comfort with a glossy, spicy finish.",
    summary: "Springy noodles tossed in a glossy chili-garlic sauce, finished with crisp vegetables and jammy eggs. Fast enough for a weeknight, but layered enough to feel like a proper dinner.",
    ingredientList: ["10 oz wheat noodles", "3 tbsp chili crisp", "2 tbsp light soy sauce", "1 tbsp rice vinegar", "2 tsp toasted sesame oil", "3 garlic cloves, grated", "2 soft-boiled eggs", "1 cup snap peas", "2 scallions, sliced", "1 tsp sesame seeds", "Fresh lime"],
    savedPost: "/posts/instagram/chili-garlic-noodles",
    accent: "#e84b2c",
  },
  {
    title: "Green shakshuka with feta",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88",
    creator: "@mostlyplants",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    time: "35 min",
    difficulty: "Easy",
    meal: "Brunch",
    cuisine: "Mediterranean",
    ingredients: 13,
    servings: 2,
    calories: 390,
    protein: 22,
    carbs: 24,
    fat: 21,
    diet: "High protein",
    note: "Jammy eggs, bright herbs, and one skillet to wash.",
    summary: "Eggs gently set in a vibrant skillet of spinach, herbs, and leeks, with creamy feta scattered over the top. Serve it straight from the pan with warm bread.",
    ingredientList: ["6 large eggs", "5 oz baby spinach", "1 leek, sliced", "1 cup fresh herbs", "4 oz feta", "2 garlic cloves", "1 jalapeño", "1 tsp cumin", "3 tbsp olive oil", "½ lemon", "Sea salt", "Black pepper", "Warm flatbread"],
    savedPost: "/posts/instagram/green-shakshuka",
    accent: "#327a50",
  },
  {
    title: "Cloud-soft lemon tart",
    image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1200&q=88",
    creator: "@butterandcrumb",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    time: "1 hr 10",
    difficulty: "Medium",
    meal: "Dessert",
    cuisine: "French",
    ingredients: 9,
    servings: 8,
    calories: 330,
    protein: 6,
    carbs: 42,
    fat: 15,
    diet: "Make ahead",
    note: "Bright citrus custard in a crisp, buttery shell.",
    summary: "A crisp pastry shell filled with silky lemon custard and a soft cloud of cream. The filling can be prepared ahead, making this an easy finish for a dinner party.",
    ingredientList: ["1 pastry shell", "4 large eggs", "¾ cup caster sugar", "3 lemons", "½ cup heavy cream", "6 tbsp unsalted butter", "1 tsp vanilla", "Pinch of sea salt", "Powdered sugar"],
    savedPost: "/posts/instagram/cloud-lemon-tart",
    accent: "#d9a62e",
  },
];

const options = [
  { id: "01", name: "Essential overlay", note: "Fastest scan", best: "Best for a visual cookbook where choosing what looks good is the first job." },
  { id: "02", name: "Editorial split", note: "Calm + premium", best: "Best for larger desktop cards and a more considered, magazine-like brand." },
  { id: "03", name: "Tonight card", note: "Decision support", best: "Best when time, effort, and serving size drive the dinner decision." },
  { id: "04", name: "Quick-pick row", note: "Dense libraries", best: "Best for search results, mobile lists, and people scanning many saved recipes." },
  { id: "05", name: "Macro compass", note: "Nutrition first", best: "Best when nutrition is a trusted product feature, not just another badge." },
  { id: "06", name: "From the reel", note: "Keeps provenance", best: "Best for preserving the social-media origin and creator relationship." },
  { id: "07", name: "Cookbook tab", note: "Collectible object", best: "Best for a warm, personal recipe box with an editorial point of view." },
  { id: "08", name: "Bento utility", note: "Actions upfront", best: "Best when adding to groceries or starting cook mode matters as much as browsing." },
  { id: "09", name: "Mise en place", note: "Ingredient cue", best: "Best when pantry fit and ingredient complexity are the key choice criteria." },
  { id: "10", name: "Reel to meal", note: "Most product-specific", best: "Best overall fit: it connects the saved reel to an immediately cookable recipe." },
];

let activeOption = Math.max(0, Math.min(9, Number(new URLSearchParams(location.search).get("option") || 1) - 1));
let activeRecipe = 0;
let saved = false;
let bagged = false;

const optionList = document.querySelector("#option-list");
const stage = document.querySelector("#preview-stage");
const toast = document.querySelector("#toast");
const sheet = document.querySelector("#recipe-sheet");
let activeSheetTab = "summary";

function iconButton(kind, label, active = false) {
  return `<button type="button" class="icon-btn ${active ? "is-active" : ""}" data-action="${kind}" aria-label="${label}" aria-pressed="${active}">${icons[kind]}</button>`;
}

function meta(recipe, includeDifficulty = true) {
  return `<div class="card-meta"><span>${icons.clock}${recipe.time}</span>${includeDifficulty ? `<i></i><span>${recipe.difficulty}</span>` : ""}<i></i><span>${recipe.servings} servings</span></div>`;
}

function renderCard(index, r) {
  const bookmark = iconButton("bookmark", saved ? "Remove from saved" : "Save recipe", saved);
  const bag = iconButton("bag", bagged ? "Remove from grocery list" : "Add to grocery list", bagged);
  const image = `<img src="${r.image}" alt="${r.title}" />`;
  const open = `data-action="open" role="button" tabindex="0" aria-label="Open ${r.title}"`;

  switch (index) {
    case 0: return `<article class="food-card v1" style="--accent:${r.accent}" ${open}>
      ${image}<div class="shade"></div><div class="floating-actions">${bookmark}</div>
      <div class="overlay-copy"><span class="pill pill--light">${r.meal}</span><h3>${r.title}</h3>${meta(r, false)}</div>
    </article>`;
    case 1: return `<article class="food-card v2" style="--accent:${r.accent}">
      <div class="v2-photo" ${open}>${image}<span class="index-mark">Recipe / 024</span></div>
      <div class="v2-copy"><div class="topline"><span>${r.cuisine}</span>${bookmark}</div><h3 ${open}>${r.title}</h3><p>${r.note}</p>${meta(r)}<button class="text-action" data-action="open">Open recipe ${icons.arrow}</button></div>
    </article>`;
    case 2: return `<article class="food-card v3" style="--accent:${r.accent}" ${open}>
      <div class="v3-image">${image}<span class="score">92% match</span></div>
      <div class="v3-copy"><span class="overline">Good for tonight</span><h3>${r.title}</h3>
      <div class="decision-grid"><span><b>${r.time}</b>total</span><span><b>${r.difficulty}</b>effort</span><span><b>${r.servings}</b>servings</span></div>
      <div class="v3-bottom"><span class="pantry"><b>8</b> / ${r.ingredients} items on hand</span>${bookmark}</div></div>
    </article>`;
    case 3: return `<article class="food-card v4" style="--accent:${r.accent}">
      <div class="v4-image" ${open}>${image}<span class="play">${icons.play}</span></div>
      <div class="v4-copy" ${open}><span class="overline">${r.meal} · ${r.cuisine}</span><h3>${r.title}</h3>${meta(r, false)}<span class="creator">Saved from ${r.creator}</span></div>
      <div class="v4-actions">${bookmark}${bag}</div>
    </article>`;
    case 4: return `<article class="food-card v5" style="--accent:${r.accent}">
      <div class="v5-image" ${open}>${image}${bookmark}</div><div class="v5-copy"><span class="overline">Balanced plate</span><h3 ${open}>${r.title}</h3>
      <div class="macro-layout"><div class="cal-ring" style="--pct:78%"><b>${r.calories}</b><span>kcal</span></div><div class="macros"><span><i style="--w:${r.protein * 2.4}%"></i><b>${r.protein}g</b> protein</span><span><i style="--w:${r.carbs}%"></i><b>${r.carbs}g</b> carbs</span><span><i style="--w:${r.fat * 2.3}%"></i><b>${r.fat}g</b> fat</span></div></div>
      <div class="v5-bottom"><span>${r.diet}</span><button data-action="open">See recipe ${icons.arrow}</button></div></div>
    </article>`;
    case 5: return `<article class="food-card v6" style="--accent:${r.accent}">
      <div class="v6-image" ${open}>${image}<span class="reel-chip">${icons.play} Reel saved</span></div>
      <div class="creator-row"><img src="${r.avatar}" alt=""/><div><b>${r.creator}</b><span>Original creator</span></div>${bookmark}</div>
      <div class="v6-copy" ${open}><h3>${r.title}</h3>${meta(r, false)}<p>${r.note}</p></div>
      <button class="reel-action" data-action="open">Cook from this reel ${icons.arrow}</button>
    </article>`;
    case 6: return `<article class="food-card v7" style="--accent:${r.accent}">
      <span class="paper-tab">${r.meal}</span><div class="v7-image" ${open}>${image}<span class="page-no">024</span></div>
      <div class="v7-copy"><span class="script">Saved favorite</span><h3 ${open}>${r.title}</h3><p>${r.note}</p>
      <div class="rule"></div><div class="v7-footer"><span>${r.time} · Serves ${r.servings}</span>${bookmark}</div></div>
    </article>`;
    case 7: return `<article class="food-card v8" style="--accent:${r.accent}">
      <div class="v8-main" ${open}>${image}<div class="v8-title"><span>${r.cuisine}</span><h3>${r.title}</h3></div></div>
      <div class="bento-cell stat"><b>${r.time}</b><span>ready in</span></div><div class="bento-cell stat"><b>${r.ingredients}</b><span>ingredients</span></div>
      <button class="bento-cell action" data-action="bag">${icons.bag}<span>${bagged ? "Added" : "Groceries"}</span></button>
      <button class="bento-cell action action--dark" data-action="open">${icons.play}<span>Cook</span></button>
    </article>`;
    case 8: return `<article class="food-card v9" style="--accent:${r.accent}">
      <div class="v9-head"><span>${r.meal}</span>${bookmark}</div><div class="v9-image" ${open}>${image}</div>
      <div class="v9-copy"><h3 ${open}>${r.title}</h3><p>${r.note}</p>
      <div class="ingredient-preview"><span>noodles</span><span>chili crisp</span><span>scallion</span><span>+${r.ingredients - 3}</span></div>
      <div class="v9-footer"><span>${icons.clock}${r.time}</span><button data-action="open">See all ingredients</button></div></div>
    </article>`;
    default: return `<article class="food-card v10" style="--accent:${r.accent}">
      <div class="v10-image" ${open}>${image}<span class="source-flag">${icons.spark} Extracted from reel</span><span class="play play--large">${icons.play}</span></div>
      <div class="v10-copy"><div class="v10-title"><div><span>${r.creator} · ${r.meal}</span><h3 ${open}>${r.title}</h3></div>${bookmark}</div>
      <div class="confidence"><span><i></i></span><b>Recipe ready</b><small>Steps and amounts checked</small></div>
      <div class="v10-footer"><span>${icons.clock}${r.time}</span><span>${r.ingredients} ingredients</span><button data-action="bag">${bagged ? "Added ✓" : "Add to groceries"}</button></div></div>
    </article>`;
  }
}

function renderOptions() {
  optionList.innerHTML = options.map((option, index) => `<button type="button" role="tab" aria-selected="${index === activeOption}" class="option ${index === activeOption ? "is-active" : ""}" data-option="${index}"><span>${option.id}</span><b>${option.name}</b><small>${option.note}</small></button>`).join("");
}

function render() {
  const option = options[activeOption];
  const recipe = recipes[activeRecipe];
  document.querySelector("#option-count").textContent = `${option.id} / 10`;
  document.querySelector("#preview-kicker").textContent = `Option ${option.id} · ${option.note}`;
  document.querySelector("#preview-title").textContent = option.name;
  document.querySelector("#preview-rationale").textContent = option.best;
  document.querySelector("#preview-best-for").innerHTML = `<strong>Design principle:</strong> ${designPrinciples[activeOption]}`;
  stage.className = `preview-stage theme-${activeOption + 1}`;
  stage.innerHTML = renderCard(activeOption, recipe);
  renderOptions();
  history.replaceState(null, "", `?option=${activeOption + 1}`);
}

function sheetPanel(recipe, tab) {
  if (tab === "ingredients") {
    return `<div class="ingredients-panel"><div class="ingredients-intro"><b>${recipe.ingredients} ingredients</b><span>For ${recipe.servings} servings</span></div><ul>${recipe.ingredientList.map((ingredient) => `<li><span class="ingredient-check" aria-hidden="true"></span>${ingredient}</li>`).join("")}</ul></div>`;
  }
  if (tab === "macros") {
    const macroTotal = recipe.protein * 4 + recipe.carbs * 4 + recipe.fat * 9;
    const macroItems = [
      ["Protein", recipe.protein, Math.round((recipe.protein * 4 / macroTotal) * 100), "#2f8061"],
      ["Carbs", recipe.carbs, Math.round((recipe.carbs * 4 / macroTotal) * 100), "#e7a936"],
      ["Fat", recipe.fat, Math.round((recipe.fat * 9 / macroTotal) * 100), "#e85b3b"],
    ];
    return `<div class="macros-panel"><div class="macro-total"><span>Per serving</span><b>${recipe.calories}</b><small>calories</small></div><div class="macro-detail">${macroItems.map(([label, grams, percent, color]) => `<div class="macro-row"><div><b>${label}</b><span>${grams}g · ${percent}%</span></div><span class="macro-track"><i style="width:${percent}%;background:${color}"></i></span></div>`).join("")}<p>Estimated values based on the extracted ingredients and ${recipe.servings} servings.</p></div></div>`;
  }
  return `<div class="summary-panel"><p>${recipe.summary}</p><div class="summary-facts"><span>${icons.clock}<b>${recipe.time}</b><small>Total time</small></span><span>${icons.spark}<b>${recipe.difficulty}</b><small>Difficulty</small></span><span>${icons.users}<b>${recipe.servings}</b><small>Servings</small></span></div><div class="summary-tags"><span>${recipe.cuisine}</span><span>${recipe.meal}</span><span>${recipe.diet}</span></div></div>`;
}

function renderSheet() {
  const recipe = recipes[activeRecipe];
  document.querySelector("#sheet-image").src = recipe.image;
  document.querySelector("#sheet-image").alt = recipe.title;
  document.querySelector("#sheet-title").textContent = recipe.title;
  document.querySelector("#sheet-creator").textContent = `${recipe.creator} · ${recipe.cuisine}`;
  document.querySelector("#ingredient-count").textContent = recipe.ingredients;
  document.querySelector("#saved-post-link").href = recipe.savedPost;
  document.querySelector("#sheet-content").innerHTML = sheetPanel(recipe, activeSheetTab);
  document.querySelector(".sheet-grocery").innerHTML = `${icons.bag}${bagged ? "Added to groceries ✓" : "Add ingredients to groceries"}`;
  document.querySelectorAll(".sheet-tab").forEach((tab) => {
    const isActive = tab.dataset.sheetTab === activeSheetTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function openSheet() {
  activeSheetTab = "summary";
  renderSheet();
  sheet.hidden = false;
  document.body.classList.add("sheet-open");
  document.querySelector("#close-sheet").focus();
}

function closeSheet() {
  sheet.hidden = true;
  document.body.classList.remove("sheet-open");
}

const designPrinciples = [
  "Use the image as the invitation; keep only time and servings in the first scan.",
  "Give the title room to breathe and move supporting data into a quiet reading rhythm.",
  "Answer the three pre-cook questions: how long, how hard, and will it feed us?",
  "Optimize vertical density without shrinking tap targets or losing source context.",
  "Make nutrition legible as a system instead of distributing it across colorful chips.",
  "Treat the creator as useful context, because this recipe began as saved social content.",
  "Make a digital save feel like a recipe worth keeping, revisiting, and annotating.",
  "Separate browse, grocery, and cook jobs into unmistakable spatial zones.",
  "Preview actual ingredients so pantry fit is visible before opening the recipe.",
  "Show the product transformation—from reel to reliable recipe—inside the card itself.",
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function moveOption(delta) {
  activeOption = (activeOption + delta + options.length) % options.length;
  render();
  document.querySelector(`[data-option="${activeOption}"]`)?.scrollIntoView({ block: "nearest" });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-action]");
  if (!target) return;
  if (target.dataset.option !== undefined) {
    activeOption = Number(target.dataset.option);
    render();
    return;
  }
  if (target.dataset.recipe !== undefined) {
    activeRecipe = Number(target.dataset.recipe);
    document.querySelectorAll(".recipe-dot").forEach((dot, index) => dot.classList.toggle("is-active", index === activeRecipe));
    render();
    return;
  }
  if (target.dataset.action === "bookmark") {
    saved = !saved;
    showToast(saved ? "Saved to your cookbook" : "Removed from saved");
    render();
  } else if (target.dataset.action === "bag") {
    bagged = !bagged;
    showToast(bagged ? "Ingredients added to groceries" : "Removed from groceries");
    render();
    if (!sheet.hidden) renderSheet();
  } else if (target.dataset.action === "open") {
    openSheet();
  } else if (target.dataset.sheetTab) {
    activeSheetTab = target.dataset.sheetTab;
    renderSheet();
  }
});

document.querySelector("#previous-option").addEventListener("click", () => moveOption(-1));
document.querySelector("#next-option").addEventListener("click", () => moveOption(1));
document.querySelector("#close-sheet").addEventListener("click", closeSheet);
sheet.addEventListener("click", (event) => {
  if (event.target === sheet) closeSheet();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !sheet.hidden) {
    closeSheet();
    return;
  }
  if (event.key === "ArrowLeft") moveOption(-1);
  if (event.key === "ArrowRight") moveOption(1);
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[data-action="open"]')) openSheet();
});

render();
