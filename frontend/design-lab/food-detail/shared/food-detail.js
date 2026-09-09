const icons = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3 1.8"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 18.5c.5-3 2.1-4.5 5-4.5s4.5 1.5 5 4.5M14 14c3.7-.3 5.8 1.2 6.2 4.5"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8.5h14l-1 11H6l-1-11Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/></svg>',
};

const recipes = [
  {
    title: "Crispy chili garlic noodles",
    creator: "@thefeedfeed",
    cuisine: "Chinese-inspired",
    meal: "Dinner",
    time: "25 min",
    difficulty: "Easy",
    servings: 4,
    calories: 480,
    protein: 19,
    carbs: 58,
    fat: 18,
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1400&q=88",
    summary: "Springy noodles tossed in a glossy chili-garlic sauce, finished with crisp vegetables and jammy eggs. Fast enough for a weeknight, layered enough to feel like a proper dinner.",
    ingredients: ["10 oz wheat noodles", "3 tbsp chili crisp", "2 tbsp light soy sauce", "1 tbsp rice vinegar", "2 tsp toasted sesame oil", "3 garlic cloves, grated", "2 soft-boiled eggs", "1 cup snap peas", "2 scallions, sliced", "Fresh lime"],
    steps: ["Boil noodles until just tender; reserve a cup of cooking water.", "Whisk chili crisp, soy, vinegar, sesame oil, and garlic.", "Toss noodles with sauce and enough cooking water to turn glossy.", "Fold in snap peas and finish with eggs, scallions, and lime."],
    tags: ["Vegetarian", "Weeknight", "One pot"],
    confidence: 94,
  },
  {
    title: "Green shakshuka with feta",
    creator: "@mostlyplants",
    cuisine: "Mediterranean",
    meal: "Brunch",
    time: "35 min",
    difficulty: "Easy",
    servings: 2,
    calories: 390,
    protein: 22,
    carbs: 24,
    fat: 21,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=88",
    summary: "Eggs gently set in a vibrant skillet of spinach, herbs, and leeks, with creamy feta scattered over the top. Serve it straight from the pan with warm bread.",
    ingredients: ["6 large eggs", "5 oz baby spinach", "1 leek, sliced", "1 cup fresh herbs", "4 oz feta", "2 garlic cloves", "1 jalapeño", "1 tsp cumin", "3 tbsp olive oil", "½ lemon", "Warm flatbread"],
    steps: ["Soften leek, garlic, and jalapeño in olive oil.", "Wilt in spinach and herbs, then season with cumin.", "Make wells, crack in eggs, and cover until softly set.", "Scatter feta and serve with lemon and flatbread."],
    tags: ["High protein", "Vegetarian", "One skillet"],
    confidence: 89,
  },
  {
    title: "Cloud-soft lemon tart",
    creator: "@butterandcrumb",
    cuisine: "French",
    meal: "Dessert",
    time: "1 hr 10",
    difficulty: "Medium",
    servings: 8,
    calories: 330,
    protein: 6,
    carbs: 42,
    fat: 15,
    image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1400&q=88",
    summary: "A crisp pastry shell filled with silky lemon custard and a soft cloud of cream. The filling can be prepared ahead for an easy dinner-party finish.",
    ingredients: ["1 pastry shell", "4 large eggs", "¾ cup caster sugar", "3 lemons", "½ cup heavy cream", "6 tbsp unsalted butter", "1 tsp vanilla", "Pinch of sea salt", "Powdered sugar"],
    steps: ["Blind-bake the pastry shell until deeply golden.", "Whisk eggs, sugar, lemon juice, zest, cream, and salt.", "Cook gently until thick, then whisk in butter.", "Fill the shell, chill until set, and finish with cream."],
    tags: ["Make ahead", "Baking", "Celebration"],
    confidence: 86,
  },
];

const options = [
  ["01", "Sidecar sheet", "Balanced reference", "Image and provenance stay anchored while the recipe scrolls independently."],
  ["02", "Editorial spread", "Story first", "A generous magazine layout for recipes worth lingering over."],
  ["03", "Cook command", "Action first", "Puts the next cooking step, timers, and progress at the center."],
  ["04", "Reel storyboard", "Source first", "Keeps the social video narrative visible beside the extracted recipe."],
  ["05", "Ingredient workbench", "Prep first", "Optimizes for scaling, checking, grouping, and grocery planning."],
  ["06", "Step timeline", "Method first", "Makes sequence and active cooking time effortless to scan."],
  ["07", "Nutrition compass", "Macros first", "Treats nutrition as a decision tool instead of a footnote."],
  ["08", "Mise en place board", "Spatial prep", "Groups ingredients and equipment into a visual pre-cook checklist."],
  ["09", "Compact drawer", "Fast reference", "A dense, mobile-friendly detail surface for quick checks."],
  ["10", "Recipe proof", "Trust first", "Explains how confidently the reel became a usable recipe."],
];

let activeOption = Math.max(0, Math.min(9, Number(new URLSearchParams(location.search).get("option") || 1) - 1));
let activeRecipe = 0;
let scale = 1;
let checked = new Set();

const optionList = document.querySelector("#option-list");
const stage = document.querySelector("#preview-stage");
const toast = document.querySelector("#toast");

function facts(r) {
  return `<div class="facts"><span>${icons.clock}<b>${r.time}</b><small>Total time</small></span><span>${icons.spark}<b>${r.difficulty}</b><small>Difficulty</small></span><span>${icons.users}<b>${r.servings * scale}</b><small>Servings</small></span></div>`;
}

function ingredientList(r, limit = r.ingredients.length) {
  return `<ul class="ingredient-list">${r.ingredients.slice(0, limit).map((item, index) => `<li class="${checked.has(index) ? "is-checked" : ""}"><button data-check="${index}"><i>${checked.has(index) ? "✓" : ""}</i><span>${item}</span></button></li>`).join("")}</ul>`;
}

function stepList(r, compact = false) {
  return `<ol class="step-list ${compact ? "is-compact" : ""}">${r.steps.map((step, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><p>${step}</p>${index === 1 ? '<button data-action="timer">Start 8 min timer</button>' : ""}</li>`).join("")}</ol>`;
}

function macros(r) {
  const total = r.protein * 4 + r.carbs * 4 + r.fat * 9;
  const rows = [["Protein", r.protein, r.protein * 4], ["Carbs", r.carbs, r.carbs * 4], ["Fat", r.fat, r.fat * 9]];
  return `<div class="macro-panel"><div class="cal-ring" style="--pct:${Math.min(96, Math.round(r.calories / 6))}%"><b>${r.calories}</b><span>kcal / serving</span></div><div class="macro-rows">${rows.map(([name, grams, energy]) => `<div><span><b>${name}</b><small>${grams}g · ${Math.round(energy / total * 100)}%</small></span><i><em style="width:${Math.round(energy / total * 100)}%"></em></i></div>`).join("")}</div></div>`;
}

function heading(r) {
  return `<header class="detail-heading"><p>${r.creator} · ${r.cuisine}</p><h2>${r.title}</h2><div class="tag-row">${r.tags.map((tag) => `<span>${tag}</span>`).join("")}</div></header>`;
}

function actions() {
  return `<footer class="detail-actions"><button data-action="grocery">${icons.bag} Add to groceries</button><button data-action="cook">Start cook mode →</button></footer>`;
}

function renderDesign(index, r) {
  if (index === 0) return `<article class="detail-card d1"><div class="hero"><img src="${r.image}" alt="${r.title}"><span>Saved from ${r.creator}</span></div><div class="body">${heading(r)}<nav><b>Summary</b><span>Ingredients ${r.ingredients.length}</span><span>Macros</span></nav><p class="lead">${r.summary}</p>${facts(r)}${actions()}</div></article>`;
  if (index === 1) return `<article class="detail-card d2"><div class="editorial-hero"><img src="${r.image}" alt=""><span>${r.meal} / ${r.cuisine}</span></div><div class="editorial-copy">${heading(r)}<p class="dropcap">${r.summary}</p>${facts(r)}<div class="two-col"><section><h3>Ingredients</h3>${ingredientList(r, 6)}</section><section><h3>Method</h3>${stepList(r, true)}</section></div>${actions()}</div></article>`;
  if (index === 2) return `<article class="detail-card d3">${heading(r)}<div class="command-grid"><aside><span class="progress">Step 2 of ${r.steps.length}</span><h3>${r.steps[1]}</h3><button data-action="timer">Start 8:00 timer</button></aside><section>${stepList(r)}</section></div><div class="command-footer"><span>${r.time} total</span><span>${r.servings * scale} servings</span><button data-action="cook">Resume cooking →</button></div></article>`;
  if (index === 3) return `<article class="detail-card d4"><div class="reel-pane"><img src="${r.image}" alt=""><button data-action="reel">${icons.play}<span>Watch original reel</span></button><small>Saved from ${r.creator}</small></div><div class="reel-copy">${heading(r)}<p>${r.summary}</p><div class="frame-strip"><i>00:04</i><i>00:18</i><i>00:31</i><i>00:46</i></div><section><h3>What we extracted</h3><span>${r.ingredients.length} ingredients</span><span>${r.steps.length} clear steps</span><span>${r.confidence}% confidence</span></section>${actions()}</div></article>`;
  if (index === 4) return `<article class="detail-card d5">${heading(r)}<div class="workbench-tools"><b>${r.ingredients.length} ingredients</b><div><button data-scale="0.5">½×</button><button class="is-active" data-scale="1">1×</button><button data-scale="2">2×</button></div><button data-action="grocery">${icons.bag} Groceries</button></div><div class="ingredient-groups"><section><h3>Core recipe</h3>${ingredientList(r, 6)}</section><section><h3>Finish & garnish</h3>${ingredientList({...r, ingredients: r.ingredients.slice(6)}, 5)}</section></div>${actions()}</article>`;
  if (index === 5) return `<article class="detail-card d6"><aside><img src="${r.image}" alt="">${heading(r)}${facts(r)}${actions()}</aside><main><p class="overline">The method</p>${stepList(r)}</main></article>`;
  if (index === 6) return `<article class="detail-card d7"><div class="nutrition-head"><div>${heading(r)}<p>${r.summary}</p></div>${macros(r)}</div><div class="nutrition-grid"><section><h3>Why it works</h3><div class="benefit-row"><span>High protein</span><span>Balanced energy</span><span>Fiber rich</span></div></section><section><h3>Ingredients</h3>${ingredientList(r, 5)}</section></div>${actions()}</article>`;
  if (index === 7) return `<article class="detail-card d8">${heading(r)}<div class="mise-grid"><section><span>01</span><h3>Counter</h3>${ingredientList(r, 4)}</section><section><span>02</span><h3>Fridge</h3>${ingredientList({...r, ingredients: r.ingredients.slice(4, 7)}, 3)}</section><section><span>03</span><h3>Equipment</h3><ul><li>Large skillet</li><li>Mixing bowl</li><li>Chef's knife</li></ul></section><section class="ready"><span>Ready?</span><h3>Everything in place</h3><button data-action="cook">Start cooking →</button></section></div></article>`;
  if (index === 8) return `<article class="detail-card d9"><div class="drawer-top"><img src="${r.image}" alt="">${heading(r)}</div><div class="drawer-meta"><span>${r.time}</span><span>${r.difficulty}</span><span>Serves ${r.servings}</span></div><details open><summary>Ingredients <b>${r.ingredients.length}</b></summary>${ingredientList(r, 6)}</details><details><summary>Steps <b>${r.steps.length}</b></summary>${stepList(r, true)}</details>${actions()}</article>`;
  return `<article class="detail-card d10"><div class="proof-hero"><img src="${r.image}" alt="">${heading(r)}</div><div class="proof-body"><section class="confidence-card"><div style="--score:${r.confidence}%"><b>${r.confidence}%</b></div><span><strong>Recipe ready</strong><small>Amounts and steps cross-checked against the reel</small></span></section><div class="proof-grid"><section><h3>Source evidence</h3><p>Caption, on-screen text, creator notes, and video frames contributed to this recipe.</p><button data-action="reel">Review original reel →</button></section><section><h3>What may vary</h3><p>Salt, garnish, and exact heat level should be adjusted to taste.</p><button data-action="details">See extraction details →</button></section></div>${facts(r)}${actions()}</div></article>`;
}

function renderOptions() {
  optionList.innerHTML = options.map((option, index) => `<button type="button" role="tab" aria-selected="${index === activeOption}" class="option ${index === activeOption ? "is-active" : ""}" data-option="${index}"><span>${option[0]}</span><b>${option[1]}</b><small>${option[2]}</small></button>`).join("");
}

function render() {
  const option = options[activeOption];
  const recipe = recipes[activeRecipe];
  document.querySelector("#option-count").textContent = `${option[0]} / 10`;
  document.querySelector("#preview-kicker").textContent = `Option ${option[0]} · ${option[2]}`;
  document.querySelector("#preview-title").textContent = option[1];
  document.querySelector("#preview-rationale").textContent = option[3];
  document.querySelector("#preview-best-for").innerHTML = `<strong>Best for:</strong> ${option[3]}`;
  stage.className = `preview-stage theme-${activeOption + 1}`;
  stage.innerHTML = renderDesign(activeOption, recipe);
  document.querySelectorAll(".recipe-dot").forEach((dot, index) => dot.classList.toggle("is-active", index === activeRecipe));
  renderOptions();
  history.replaceState(null, "", `?option=${activeOption + 1}`);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("is-visible"), 1700);
}

function moveOption(delta) {
  activeOption = (activeOption + delta + options.length) % options.length;
  checked = new Set();
  render();
}

document.addEventListener("click", (event) => {
  const option = event.target.closest("[data-option]");
  if (option) { activeOption = Number(option.dataset.option); checked = new Set(); render(); return; }
  const recipe = event.target.closest("[data-recipe]");
  if (recipe) { activeRecipe = Number(recipe.dataset.recipe); checked = new Set(); render(); return; }
  const check = event.target.closest("[data-check]");
  if (check) { const index = Number(check.dataset.check); checked.has(index) ? checked.delete(index) : checked.add(index); render(); return; }
  const scaleButton = event.target.closest("[data-scale]");
  if (scaleButton) { scale = Number(scaleButton.dataset.scale); render(); notify(`Scaled to ${scale}×`); return; }
  const action = event.target.closest("[data-action]");
  if (action) notify({ grocery: "Ingredients added to groceries", cook: "Cook mode started", timer: "8 minute timer started", reel: "Opening the original reel", details: "Extraction evidence opened" }[action.dataset.action] || "Done");
});

document.querySelector("#previous-option").addEventListener("click", () => moveOption(-1));
document.querySelector("#next-option").addEventListener("click", () => moveOption(1));
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") moveOption(-1);
  if (event.key === "ArrowRight") moveOption(1);
});

render();
