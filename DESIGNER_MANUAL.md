# Designer Manual: Authoring Models for the Systems Dynamics Game

You are designing simulation models that students will play with in a web-based learning game. You build the model in a free tool called **simlin**, follow a few simple naming conventions so the game knows what students can interact with, then upload the file to a folder on GitHub. The game appears online automatically a minute or two later.

You do not need to write any code. You do not need to install anything. The whole workflow runs in your browser.

## What you'll need

- A free simlin account (sign up at simlin.com)
- A GitHub account with access to the game's repository (the developer will invite you)
- A clear idea of the system you want to model — the kind of thing you would sketch on a whiteboard with stocks (things that accumulate) and flows (rates of change)

## One-time setup

1. Go to **simlin.com** and create a free account
2. Read the simlin "getting started" page. Build the example model they walk you through. About 20 minutes; it teaches you the basic moves: dropping stocks, drawing flows, writing equations
3. Open the game's GitHub repository (the developer will send you a link). Click around the `public/models/` folder so you know what's there. You don't need to change anything yet — just look

## Building a model

In simlin, every model is built from four kinds of pieces:

- **Stocks** (rectangles): things that accumulate over time. Water in a reservoir. Money in a bank. People in a city.
- **Flows** (arrows with a valve symbol): the rates at which stocks fill or drain. Rainfall. Withdrawals. Births and deaths.
- **Auxiliaries** (small circles): supporting calculations or input parameters. Reservoir capacity. Interest rate. Birth rate.
- **Connectors** (thin curved arrows): show that one variable is used in another's equation.

Build your model in simlin. Use the simulate button to check that it runs and the curves look reasonable. **The model must run without errors before you do anything else** — there's no point uploading a broken model and then trying to fix it from inside the game.

## The four conventions

Once your model works, this is where you make it playable. There are four conventions, all about what you name your variables.

### 1. Sliders → rename to `param_<n>`

Any auxiliary you want students to adjust via a slider, rename so it starts with `param_`. Examples:
- `rainfall` → `param_rainfall`
- `pumping_rate` → `param_pumping_rate`
- `population_growth_rate` → `param_population_growth_rate`

Then click the variable in simlin and set its **range** (in the variable details panel — look for "scale" or "range"). The min and max define the slider's bounds. The current value becomes the default.

If you don't set a range, the game uses 0 to 2× the current value as a fallback. That's almost never what you want, so always set the range explicitly.

### 2. Toggles → rename flows to `toggle_<n>`

Any flow that students should be able to turn on and off, rename so it starts with `toggle_`. Examples:
- `recharge` → `toggle_recharge`
- `groundwater_pumping` → `toggle_groundwater_pumping`

When a student turns it off in the game, the flow's value becomes zero — like closing a tap. When they turn it on, it uses whatever equation you wrote.

### 3. Default chart variables → rename stocks/auxes to `chart_<n>`

Any stock or auxiliary you want shown by default on the time-series chart, rename so it starts with `chart_`. Example:
- `aquifer_level` → `chart_aquifer_level`

Students can add other variables to the chart themselves, but the `chart_` ones are what they see when the model first loads. Pick the 2-3 most important ones; don't prefix everything.

### 4. Everything else: leave the name plain

Variables without a prefix are visible in the diagram with tooltips, but students can't directly modify them. They're internal model machinery — useful for the student to see, but not for them to change.

## Writing tooltips

This is the most important documentation step.

For every variable in your model — including the ones with no prefix — fill in the **documentation field** in simlin (the variable details panel has a "doc" or "documentation" section). Whatever you write here becomes the tooltip the student sees when they hover over that variable in the game.

Write for a 12-15 year old who has never seen this model before. One or two sentences. Plain language.

**Good tooltips:**
- "How much rain falls on the area each month, on average."
- "The total amount of water sitting underground, available to be pumped up."
- "When this is on, water seeps back into the aquifer from rivers and rainfall."

**Bad tooltips:**
- "Rainfall input variable" — too jargon-y, doesn't explain what the student is looking at
- "" (empty) — the student gets no help and the tooltip looks broken
- A whole paragraph of theory — they're hovering, not reading an essay

Also fill in the **units** field for every variable. The game displays units in tooltips and on chart axes. Without units, students see numbers floating in space and can't reason about them physically.

## The model description

Every simlin model has a top-level documentation field (under the model's properties or settings, depending on the simlin UI version). Fill this in with a short description of the system and what the player is exploring. Two to four sentences. This appears in the model picker on the home screen and at the top of the page when a student loads the model.

Example:
> The borewell game. Each player decides how aggressively to pump water from a shared underground aquifer. The aquifer recharges naturally, but slowly. Watch what happens when everyone pumps as much as they want — and try turning off the recharge to see how dependent the system is on something we usually ignore.

## Optional: a richer description file

If you want to write more than a few sentences — say, a guided introduction, suggested experiments, learning goals, or discussion questions — create a separate description file alongside your model.

If your model is `borewell.xmile`, create `borewell.md` in the same folder. This file uses **Markdown**, which is plain text with a few simple formatting rules:

- `# Heading` for a big heading, `## Heading` for a smaller one
- `**bold**` for bold, `*italic*` for italic
- `- item` for bullet points
- A blank line between paragraphs

Example `borewell.md`:

```
# The Borewell Game

In many parts of the world, communities share a single underground
aquifer — a giant natural water tank. Each household decides for itself
how much to pump.

## What to try

- Start with the default settings and run the simulation. What
  happens to the aquifer level over 50 years?
- Turn off the recharge flow. How quickly does the system collapse?
- Reduce the pumping rate by half. Is that enough to stabilize things?

## Things to notice

The aquifer falling isn't just about the total amount pumped. Watch
how the *rate* of fall changes when the level gets very low.
```

The game displays this richer description below the model when loaded.

## Exporting from simlin

When your model is ready:

1. In simlin, open your model
2. Open the file menu (or the model's settings menu) and look for **Export → XMILE**
3. Save the file with a clean lowercase filename, no spaces. `borewell.xmile`, not `Borewell Game v3 FINAL.xmile`

## Adding the model to the game

This is where you upload to GitHub. You can do everything through the GitHub website — no command line, no software to install.

### Step 1: Upload the model files

1. Open the game's GitHub repository in your browser
2. Click into the `public/models/` folder
3. Click the **"Add file"** button (top right) → **"Upload files"**
4. Drag your `.xmile` file onto the page
5. (Optional) Drag your `.md` description file onto the page too
6. Scroll down. In the "Commit changes" box, type a short message like `Add borewell model`
7. Click the green **"Commit changes"** button

### Step 2: Update the manifest

The game has a list of available models in a file called `index.json`. You need to add your new model to it.

1. Still in the `public/models/` folder, click on `index.json`
2. Click the **pencil icon** (top right of the file view) to edit
3. Add a new entry. The pattern looks like this:

```json
{
  "models": [
    {
      "id": "reservoir",
      "title": "The Reservoir",
      "subtitle": "A dam on a river",
      "file": "reservoir.xmile",
      "description_file": "reservoir.md"
    },
    {
      "id": "borewell",
      "title": "The Borewell Game",
      "subtitle": "What happens when everyone drills a little deeper?",
      "file": "borewell.xmile",
      "description_file": "borewell.md"
    }
  ]
}
```

The fields:
- `id` — a short lowercase name, no spaces. Used internally.
- `title` — what students see in the model picker.
- `subtitle` — a one-line teaser, also visible in the picker.
- `file` — the exact filename you uploaded.
- `description_file` — the markdown file, if you made one. Otherwise leave this field out entirely.

**Important formatting rules:**
- Each entry is wrapped in `{ }` curly braces
- Entries are separated by commas — make sure the entry *before* yours has a comma at the end of its `}`
- The whole list is wrapped in `[ ]` square brackets
- Field names and string values use double quotes, never single quotes

4. After editing, scroll down, type a commit message like `Add borewell to manifest`, click the green **"Commit changes"** button

### Step 3: Wait for the deploy

The game rebuilds automatically every time you commit. Wait about a minute, then refresh the game URL. Your model should appear in the picker.

If it doesn't appear, the most common cause is a typo in `index.json` — usually a missing comma or a mismatched quote. Open the file again and check carefully against the existing entries. The page also shows a red "X" next to the commit if something went wrong with the build — click it for details.

## Testing checklist

Before you tell anyone the model is ready, run through this list:

- [ ] The model runs without errors in simlin
- [ ] Every variable has a documentation string filled in
- [ ] Every variable has units filled in
- [ ] Player-facing variables have the correct prefix (`param_`, `toggle_`, `chart_`)
- [ ] Every slider variable has a sensible range set in simlin
- [ ] The top-level model description is filled in
- [ ] You've loaded the model in the game and tried each slider and toggle yourself
- [ ] The default chart shows useful curves (not a flat line; not an explosion off the top of the screen)
- [ ] Tooltips read clearly to someone who has never seen this model

## Common questions

**Can I edit a model after uploading it?** Yes. Open the model in simlin, make your changes, export again, and re-upload by following the same steps. The new file replaces the old one. You don't need to update the manifest unless the *filename* changes.

**Can I delete a model?** Yes. Delete the file from the `public/models/` folder using the GitHub web UI (open the file, click the trash icon), and remove its entry from `index.json`. Both in the same commit, ideally.

**Do I have to use prefixes for every variable?** No — only for ones you want to be player-facing. Internal variables that the student should see in the diagram but not modify directly should be left with plain names.

**What if I want a slider that controls multiple things at once?** Use one auxiliary with the `param_` prefix, then have other auxiliaries reference it in their equations. The slider controls the one auxiliary; the others update through the equations.

**Can I have variables that change over time on their own (not via student input)?** Yes — write a time-dependent equation in simlin. For example, `param_rainfall` could be `100 + 20 * SIN(TIME / 12 * 2 * 3.14159)` for a seasonal cycle. The slider lets the student adjust the average; the equation gives the seasonality on top of that.

**My equation involves something simlin doesn't have built in. What do I do?** simlin's function library is large but not infinite. Check their docs first. If the function genuinely isn't there, you can usually approximate it with the primitives that are (e.g., MIN, MAX, IF-THEN-ELSE, exponential). When in real doubt, ask the developer.
