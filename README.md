# The 3-Day DGX Spark Path

An interactive, slide-based learning deck that takes you from an unopened **NVIDIA DGX Spark (GB10)** to a local AI orchestrator you actually understand — not just one you copy-paste commands into.

Live at **[spark.eggers.dev](https://spark.eggers.dev)**.

## What it is

Three days, ~10 steps each, built around how people actually learn technical skills:

- **Day 1 — Boot it, and understand what you're holding** (boot + the inference/quantization fundamentals)
- **Day 2 — Serve models fast, and choose your lineup** (vLLM on sm_121 + model selection)
- **Day 3 — Wrap it in an orchestrator you can reach** (one endpoint + agent loop + make it durable)

Each day pairs a **checklist** (the doing) with an **Understanding Layer** (the learning): predict-before-you-run cards, blur-gated answers so you can't peek without committing, explain-it-back (Feynman) notes, sketch prompts, productive-failure drills, and unguided rebuild challenges. Progress, notes, and predictions persist locally and sync across devices via a personal sync code.

The learning design is grounded in desirable difficulty, retrieval practice, the Feynman technique, and the spacing effect.

## Architecture

Static, dependency-free frontend served by a Cloudflare Worker, with a tiny KV-backed sync API.

```
spark/
├── public/            # the deck (static, no build step)
│   ├── index.html
│   ├── app.js         # slide engine, checklist/sync/understanding-layer logic
│   ├── data.js        # all curriculum content (edit this to change wording/steps)
│   └── styles.css
├── src/worker.js      # serves the site + GET/PUT /api/state/:code
├── wrangler.toml      # Worker config: assets, KV binding, routes
└── package.json
```

- **Frontend:** vanilla JS, no framework, no build. Opens directly via `file://` for local editing.
- **Sync:** local-first. Renders instantly from `localStorage`, reconciles with Cloudflare KV in the background, keyed by a user-chosen sync code.
- **Hosting:** Cloudflare Worker (`spark-eggers`) with static assets + custom domain `spark.eggers.dev`.

## Editing content

All curriculum text lives in **`public/data.js`** as plain objects — steps, deep-dive dialogs, predict/Feynman/sketch/rebuild exercises, and recall cards. The engine (`app.js`) and styling (`styles.css`) rarely need touching. The day count is data-driven, so adding/removing a day updates the rail, badges, and progress automatically.

## Develop & deploy

```bash
# local preview of the Worker + sync API (simulated KV)
npx wrangler dev

# deploy to Cloudflare
npx wrangler deploy
```

Edit the static files and just refresh `public/index.html` for pure frontend work; use `wrangler dev` when testing the sync API.

## Sources & credits

Honest framing: this deck **aggregates and synthesizes** community knowledge about the DGX Spark. The technical substance belongs to the people and resources below; the curriculum, the writing, the learning method, and the platform are original.

- **[Matt Pocock — the `teach` skill](https://github.com/mattpocock)** — the teaching-workspace approach that started this whole project.
- **[Matt Van Horn — the `/last30days` skill](https://github.com/mvanhorn/last30days-skill)** — used to aggregate what the community is actually saying across Reddit, X, Hacker News, GitHub, and the web (MIT).
- **[KubeSimplify — "7 Days of DGX Spark"](https://blog.kubesimplify.com/series/7-days-of-dgx-spark)** — primary external walkthrough series; recommended reading on Day 1.
- **[llama.cpp — DGX Spark performance discussion](https://github.com/ggml-org/llama.cpp/discussions/16578)** — source of the sm_121 CPU-fallback diagnosis.
- **[NVIDIA — DGX Spark agent playbooks](https://x.com/NVIDIARTXSpark/status/2055317325444710872)** — Ollama / Hermes local-agent setup and tuned model defaults.

Built and visually polished with the **impeccable** design skill. The learning method is grounded in established cognitive science: desirable difficulty, retrieval practice, the Feynman technique, and the spacing effect.

## Notes

- The site is public; the sync code keeps each person's progress separate (not auth). A Cloudflare Access gate can be added if it should be private.
- "3 days" is the marketable promise; if a block takes longer, you just track it.
