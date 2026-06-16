/* ============================================================
   The 3-Day DGX Spark Path — curriculum content
   Edit this file to change wording, steps, dialogs, recall cards.
   It is intentionally separate from the engine (app.js).

   Structure: 3 days. Each day has a flat checklist (~10 steps) and an
   "understanding layer" (`learn`) holding ARRAYS of effortful exercises,
   plus an array of recall cards. People who take longer than a day per
   block just track it; the day count is the marketable promise.
   ============================================================ */

const CURRICULUM = {
  title: "The 3-Day DGX Spark Path",
  subtitle: "From a box you haven't powered on → a local AI orchestrator you talk to and build on.",

  mentalModel:
    "Hold this across all three days: your box is a <b>capacity</b> machine, not a <b>speed</b> machine. " +
    "128GB of unified CUDA memory at ~273 GB/s. So: hold big models resident, serve many requests at once, " +
    "run agents and batch jobs, <b>don't</b> judge it by single-stream chat speed. Every choice below " +
    "optimizes for <i>valuable orchestrator</i>, not <i>fastest token</i>.",

  // The 6 things to worry about all the way through, always reachable from the top bar.
  pinned: [
    { t: "sm_121 ≠ sm_100, and it's ARM64", d: "Wrong-architecture kernels are your #1 enemy. The GB10 is consumer Blackwell (sm_121) on ARM64 SBSA, not datacenter Blackwell (sm_100). Half the prebuilt binaries online target the wrong arch." },
    { t: "Always verify GPU offload", d: "After starting any engine, run nvidia-smi and confirm your process appears under GPU compute. Silent CPU fallback = ~3 tok/s misery, and it looks like it's 'working.'" },
    { t: "Use prebuilt GB10 wheels", d: "Never compile vLLM / FlashInfer from source unless you enjoy pain; it's a 2–4 hour build that breaks on nightlies. Prebuilt sm_121 wheels cut it to ~15 minutes." },
    { t: "Budget your 121GB", d: "Don't co-load two big models. Know each model's footprint (a Q4 70B ≈ 40GB, a 120B ≈ 65–80GB). Verify headroom before loading." },
    { t: "Design for concurrency", d: "Single-stream is the box's weakest look. It delivers ~120× more throughput at concurrency 256. Serve agents and batches, don't stare at one chat cursor." },
    { t: "Don't expose it raw", d: "Never put the inference endpoint on the open internet. Tailscale/WireGuard for remote, systemd for persistence, auth on any proxy." }
  ],

  days: [
    /* ========================================================== DAY 1 */
    {
      n: 1,
      title: "Boot it, and understand what you're holding",
      goal: "Power on for the first time, get a model answering, and build the mental model that makes every later decision obvious.",
      why: "Momentum plus understanding. Getting a working chat on day one gives you a stable base to experiment from, and grasping how a request becomes tokens (and why quantization trades quality for fit and speed) turns every later choice from guesswork into reasoning.",
      steps: [
        { label: "First boot + wire it to ethernet", detail: {
          headline: "Run the first-boot wizard, prefer a wired link",
          body: "The Spark runs <b>DGX OS</b> (an Ubuntu-based, ARM64 distribution) with the NVIDIA AI stack preinstalled. Walk the first-boot wizard (user, locale, network). Plug into <b>ethernet</b> rather than relying on Wi-Fi: you'll be pulling tens of GB of model weights and serving an API, and a stable wired link saves you debugging phantom 'slow download' issues later.",
          watchOut: "Note its LAN IP address now (you'll need it the whole path). From here on, treat the box like a headless server, not a desktop.",
          commands: ["ip addr show", "hostnamectl   # confirm OS + arch (aarch64)"] } },
        { label: "Set up headless SSH access", detail: {
          headline: "Drive it from your laptop",
          body: "You'll manage this like a server. Enable SSH on the Spark, then connect from your daily machine. Working over SSH (and later, a browser UI) means you don't need a monitor hanging off the box.",
          watchOut: "Add your laptop's public key to avoid typing passwords, and consider disabling password auth once keys work.",
          commands: ["sudo systemctl enable --now ssh", "ssh-copy-id you@spark.local   # from your laptop", "ssh you@spark.local"] } },
        { label: "Update the system & reboot", detail: {
          headline: "Patch first, build later",
          body: "Get on current packages and kernel before you install inference engines. A clean, updated base avoids 'works on the blog, not on my box' mismatches.",
          watchOut: "Reboot after a full upgrade so a new kernel and the NVIDIA driver line up.",
          commands: ["sudo apt update && sudo apt full-upgrade -y", "sudo reboot"] } },
        { label: "Verify the GPU with nvidia-smi", detail: {
          headline: "Confirm the GB10 is alive and how much memory you really have",
          body: "<code>nvidia-smi</code> is the instrument you'll return to constantly. Confirm the GB10 shows up, note the CUDA version (13.x) and the usable unified pool (~121 GiB). This is your ground truth for the whole path.",
          watchOut: "If nvidia-smi errors or shows no device, stop and fix drivers before anything else; nothing downstream works without it.",
          commands: ["nvidia-smi", "nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv"] } },
        { label: "Install Ollama + first chat", detail: {
          headline: "The 'just works' on-ramp",
          body: "Ollama is the fastest path to a working local chat on the Spark; it handles the ARM64/Blackwell details for you. Pull a small, Spark-tuned model and talk to it. This is your first win.",
          watchOut: "Start small (a 9B). You'll do model selection deliberately on Day 2; right now this is just proof of life.",
          commands: ["curl -fsSL https://ollama.com/install.sh | sh", "ollama run nemotron-nano   # or: ollama run llama3", "# type a message, a local model answers"] } },
        { label: "Read: anatomy of an inference request", detail: {
          headline: "Prompt → tokens → answer, demystified",
          body: "Work through KubeSimplify's <b>“7 Days of DGX Spark”</b> Day 1 & Day 2. You'll see how your prompt is tokenized, run through the model, and decoded back, and crucially, why the <i>memory bandwidth</i> step is what limits single-stream speed on this box.",
          watchOut: "The takeaway to internalize: token generation is memory-bandwidth-bound. That single fact explains the Spark's whole performance profile.",
          commands: [], link: { text: "KubeSimplify: 7 Days of DGX Spark", url: "https://blog.kubesimplify.com/series/7-days-of-dgx-spark" } } },
        { label: "Learn quantization in plain English", detail: {
          headline: "The highest-leverage concept for your box",
          body: "Quantization shrinks model weights (FP16 → 8-bit → 4-bit). Lower precision = smaller footprint and, because you're bandwidth-limited, <b>faster tokens</b>, at some quality cost. Q4_K_M and MXFP4/FP4 are the sweet spots you'll see most. Read KubeSimplify Day 4.",
          watchOut: "FP4 acceleration is a real strength of the GB10; models quantized to FP4/MXFP4 run notably faster here than naive setups.",
          commands: [], link: { text: "KubeSimplify Day 4: Quantization", url: "https://blog.kubesimplify.com/series/7-days-of-dgx-spark" } } },
        { label: "Compute your memory budget", detail: {
          headline: "The tier rule",
          body: "You have ~121 GiB usable. Rough footprints (Q4): a 9B ≈ 6GB, a 27B ≈ 18GB, a 70B ≈ 40GB, a 120B ≈ 65–80GB, plus KV-cache that grows with context length. Group models into S / M / L tiers and follow the rule: <b>don't co-load two big models</b> unless you've verified headroom.",
          watchOut: "Long context eats memory fast via the KV cache. A 'fits' model can OOM at 128k context. Budget context, not just weights.",
          commands: ["# rough VRAM ≈ params(billions) × bytes-per-weight", "# Q4 ≈ 0.5 bytes/weight  →  70B × 0.5 ≈ 35GB + KV cache"] } },
        { label: "Self-test: will model X fit?", detail: {
          headline: "Predict before you download",
          body: "Pick three models you're curious about and, <i>before</i> downloading 60GB, estimate each one's footprint at your intended quant and context. Then verify against the model card. Getting good at this estimate is what stops you thrashing on Day 2.",
          watchOut: "If your estimate and the model card disagree by a lot, you've probably missed the quant level or the KV-cache for long context.",
          commands: [] } }
      ],
      watchOuts: [
        "This is ARM64 SBSA + sm_121 (consumer Blackwell), not sm_100 datacenter Blackwell. Bookmark that fact: it's the root cause of most Day 2 problems.",
        "Keep everything on the LAN + SSH while booting. No internet exposure yet.",
        "Quantization is a lever, not a downgrade: on a bandwidth-limited box, a good Q4 is often the right default, not a compromise."
      ],
      win: "A local model answered your first message, and you can now predict whether any model will fit and roughly how fast it'll run, before downloading a single byte.",
      learn: {
        predicts: [
          { prompt: "Before you run <code>nvidia-smi</code>, commit to an answer: what compute-capability / architecture string will the GB10 report, and roughly how much of the 128GB will actually show as usable?",
            reveal: "Compute capability <b>12.1 (sm_121)</b>, consumer Blackwell, and about <b>~121 GiB</b> usable of the 128GB unified pool. If you guessed sm_100 or 'all 128 free', that gap is precisely the misconception that breaks Day 2. Owning it now is the point." },
          { prompt: "A 70B model at Q4. Before reading anything, predict its weight footprint in GB.",
            reveal: "Roughly <b>35–40GB</b> (about 0.5 bytes per weight × 70B), <i>plus</i> KV cache that grows with context length. If you forgot the KV cache, that's the variable that makes a 'fits' model OOM at long context." }
        ],
        feynmans: [
          { prompt: "Explain to a friend, in one or two sentences, why this box uses <i>unified</i> memory and how that differs from a normal GPU with its own separate VRAM.",
            reference: "CPU and GPU share one 128GB LPDDR5x pool, so there is no PCIe copy between system RAM and VRAM and the GPU can address far more than a discrete card's VRAM. The tradeoff: that shared memory is much lower bandwidth than a dedicated card's GDDR." },
          { prompt: "Explain why lowering the quantization makes tokens generate faster on <i>this</i> box specifically (not just 'smaller is faster').",
            reference: "Generation is bandwidth-bound: each token requires moving the model's weights across memory. Fewer bytes per weight means less data moved per token across the 273 GB/s bus, so decode speeds up. On a bandwidth-limited box the win is larger than on a high-bandwidth discrete GPU." }
        ],
        sketches: [
          { prompt: "On paper, draw the path of one request: prompt → tokens → model → decoded tokens → answer. Mark the single step that is limited by memory bandwidth.",
            reference: "prompt → [tokenizer] → token IDs → [model forward pass: reads ALL weights once per generated token ← THIS is the bandwidth bottleneck] → next-token logits → [sample] → token → (loop) → [detokenize] → text. Every token drags the whole model across the 273 GB/s bus, which is why size and quant dominate speed." }
        ],
        faildrills: [],
        rebuilds: [
          "From a fresh SSH session, without looking at the checklist, get from 'just logged in' to 'a model answered' and write down every command you actually needed. Then compare to the steps. The commands you forgot are the ones you hadn't really learned yet.",
          "Without notes, estimate whether GPT-OSS-120B at MXFP4 fits in 121GB with a 32k context. Show your math: weights + KV cache. Then sanity-check against the model card."
        ]
      },
      recalls: [
        { q: "Why prefer ethernet and headless SSH on a box that has a desktop?",
          a: "You'll run it like a server: pulling tens of GB of weights (wired = stable) and serving an API you reach over the network, so a monitor and Wi-Fi are unnecessary friction." },
        { q: "On the Spark, why does a lower quantization usually mean faster tokens?",
          a: "Token generation is memory-bandwidth-bound. Smaller (lower-precision) weights move less data per token across the 273 GB/s bus, so they decode faster, trading a little quality for speed and fit." }
      ]
    },

    /* ========================================================== DAY 2 */
    {
      n: 2,
      title: "Serve models fast, and choose your lineup",
      goal: "Stand up the real throughput engine without the silent traps, then settle on the two or three models you'll actually run.",
      why: "This is the day that separates a working box from a frustrating one. The traps here (CPU fallback, wrong-arch builds) are silent: they look like success while quietly wasting the hardware. And a small, well-understood model palette makes your orchestrator predictable, you'll know exactly what each call costs in memory and speed.",
      steps: [
        { label: "Pull a GB10-optimized vLLM container", detail: {
          headline: "Prebuilt sm_121 wheels, not source",
          body: "Stand up a <b>Blackwell/GB10-optimized vLLM</b> using prebuilt <code>sm_121</code> + FlashInfer wheels (the community maintains these, e.g. @eugr's). vLLM is your throughput engine: continuous batching, paged KV cache, an OpenAI-compatible server.",
          watchOut: "Building vLLM + FlashInfer from source is a 2–4 hour trap that breaks on nightly builds. Prebuilt wheels cut it to ~15 minutes. Don't be a hero.",
          commands: ["# use a GB10/sm_121 prebuilt image or wheels", "docker run --gpus all -p 8000:8000 <gb10-vllm-image> \\", "  --model <model> --quantization mxfp4"] } },
        { label: "Serve a model & send one request", detail: {
          headline: "Confirm the OpenAI-compatible endpoint answers",
          body: "vLLM exposes <code>/v1/chat/completions</code>. Hit it once with curl to confirm it serves. This is the same API shape your orchestrator will use later, you're building the spine now.",
          watchOut: "If the first request hangs for minutes, the model may be loading into memory, watch nvidia-smi memory climb. If it errors instantly, it's config.",
          commands: ["curl http://localhost:8000/v1/chat/completions \\", "  -H 'Content-Type: application/json' \\", "  -d '{\"model\":\"<model>\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}'"] } },
        { label: "Hit it with concurrent requests", detail: {
          headline: "See the box's real strength",
          body: "Single-stream undersells the Spark. Fire 16–256 concurrent requests and watch aggregate throughput climb; independent benchmarks show ~120× more total throughput at concurrency 256 than a single stream. This is the workload the box is built for.",
          watchOut: "Per-request latency stays modest; total tokens/sec across all requests is the number that matters for an orchestrator serving many agents.",
          commands: ["# quick concurrency probe", "vllm bench serve --model <model> --num-prompts 256 --max-concurrency 256"] } },
        { label: "VERIFY GPU offload (the fake-GPU trap)", detail: {
          headline: "The single most important check of the path",
          body: "Generic prebuilt ARM64 binaries can <b>silently fall back to CPU-only</b> and run at ~3 tok/s while looking like they work. After starting any engine, run <code>nvidia-smi</code> and confirm your process appears under <b>GPU compute processes</b> with real memory allocated.",
          watchOut: "If your process is NOT listed under GPU compute, you're on the CPU. Stop and fix the build/arch before trusting any numbers.",
          commands: ["nvidia-smi   # look for your python/vllm PID under 'Processes'", "watch -n1 nvidia-smi   # confirm GPU-Util > 0 during generation"] } },
        { label: "(If compiling llama.cpp yourself) set the right flags", detail: {
          headline: "sm_121 + the libcuda stub",
          body: "If you build llama.cpp from source for CPU/edge experiments, you must compile for the GB10 architecture and provide the ARM64 CUDA stub, or it won't offload. This is the documented fix from the community perf threads.",
          watchOut: "After building, re-run the GPU-offload check; a successful compile does not guarantee the GPU is actually used.",
          commands: ["cmake -B build -DGGML_CUDA=ON \\", "  -DCMAKE_CUDA_ARCHITECTURES=\"121\"", "# ensure libcuda.so.1 (ARM64) stub is present"],
          link: { text: "llama.cpp DGX Spark perf discussion", url: "https://github.com/ggml-org/llama.cpp/discussions/16578" } } },
        { label: "Pick your daily driver / agent brain", detail: {
          headline: "Nemotron-Nano-9B-v2 (tuned for the Spark)",
          body: "NVIDIA ships a Spark-tuned Nemotron Nano 9B and points its blueprints at it as the default. It's fast, fits easily with lots of headroom, and is strong at tool-calling, exactly what an orchestrator's planning loop needs.",
          watchOut: "This is the model that runs constantly, so keep it warm (loaded) for snappy agent loops.",
          commands: ["ollama pull nemotron-nano", "# footprint at Q4: ~6GB, leaves huge headroom"] } },
        { label: "Pick a heavy reasoning / big-memory model", detail: {
          headline: "A 70B or GPT-OSS-120B / Qwen3.5-class model",
          body: "This is <i>why you bought the box</i>: a model that no single consumer GPU can hold. Slower per token (bandwidth), but you escalate to it for hard planning or deep reasoning steps your daily driver can't handle.",
          watchOut: "Expect ~38–56 tok/s single-stream on a 120B. That's fine for a planning step you call occasionally, don't use it as your chat default.",
          commands: ["# e.g. a 70B Q4 (~40GB) or GPT-OSS-120B (MXFP4, ~65–80GB)"] } },
        { label: "Pick a coding model", detail: {
          headline: "A Qwen-coder / Gemma-class model for code",
          body: "Code tasks benefit from a specialized model. Community reports show ~140 tok/s on coding workloads with an optimized vLLM build, genuinely usable for an interactive coding orchestrator.",
          watchOut: "Match the coder's context window to your real use (whole-file edits need big context = more KV cache).",
          commands: ["# e.g. a Qwen-coder or Gemma-coder at Q4/FP8"] } },
        { label: "Record each model's quant + footprint", detail: {
          headline: "Your palette, written down",
          body: "Make a tiny table: model → quant → memory footprint → measured tok/s. This becomes the reference you use when wiring the gateway and deciding what can co-load. Measured beats guessed.",
          watchOut: "Re-measure tok/s on YOUR box; blog numbers vary by quant, container, and context.",
          commands: ["# keep a models.md:  name | quant | GB | tok/s | use"] } }
      ],
      watchOuts: [
        "A successful build is NOT proof of GPU use. Always confirm with nvidia-smi.",
        "Wrong-arch wheels are the #1 cause of 'why is my expensive box so slow', the answer is almost always CPU fallback.",
        "Resist collecting 15 models. Two or three you know cold beats a zoo you don't."
      ],
      win: "Your box is serving concurrent requests with the GPU genuinely engaged, and you have a short, deliberate model menu with known memory cost and speed.",
      learn: {
        predicts: [
          { prompt: "Before firing 256 concurrent requests: predict what happens to (a) per-request latency and (b) total throughput, versus a single stream.",
            reveal: "Per-request latency rises only modestly; <b>aggregate throughput climbs ~120×</b>. Why: the bottleneck is keeping the GPU fed, and batching many requests keeps it saturated. This is the mental model that explains why your box is a server, not a chat toy." },
          { prompt: "You're choosing a daily-driver agent brain. Predict which matters more for snappy tool-calling loops: raw parameter count, or fitting-with-headroom-and-staying-warm?",
            reveal: "<b>Headroom + warm + reliable tool-calls.</b> A 9B that's always loaded and answers in milliseconds beats a 120B that swaps in over seconds. For an orchestrator loop, speed of iteration beats peak intelligence per step, you call the big model only when you actually need it." }
        ],
        feynmans: [
          { prompt: "Explain why 'it compiled successfully' does NOT prove 'it's using the GPU.'",
            reference: "Compilation only proves the code built for <i>some</i> target. The wrong architecture (non-sm_121) or a missing CUDA lib makes it silently fall back to CPU at runtime. Only nvidia-smi showing your process under GPU compute proves real offload. A green build is not evidence." },
          { prompt: "Explain the 'cheap driver, expensive escalation' split to someone in a single breath.",
            reference: "A fast small model runs the loop and only hands the hard planning step to the big model: speed where you iterate, capability where it counts." }
        ],
        sketches: [],
        faildrills: [
          { prompt: "Cause the failure on purpose: run a generic (non-sm_121) build or force CPU, watch it crawl at ~3 tok/s, then open <code>nvidia-smi</code>. What <i>exactly</i> tells you it's running on the CPU, not the GPU? Commit to the tells before revealing.",
            reveal: "Three tells: <b>(1)</b> GPU-Util stays at 0% during generation, <b>(2)</b> your python/vLLM PID is <i>absent</i> from the Processes list in nvidia-smi, <b>(3)</b> tok/s is single digits. Now fix the build and watch your PID appear under GPU compute. The diagnosis you just practiced is the single most valuable skill in the whole path, because the failure is silent." }
        ],
        rebuilds: [
          "From scratch, write out the exact verification ritual you will run after starting ANY inference engine, in order, every single time.",
          "Without notes, write your own 3-model table (name · quant · GB · use) and justify each pick from memory. If you can't justify a model's place, it shouldn't be on the list."
        ]
      },
      recalls: [
        { q: "Your model 'works' but generates at 3 tok/s. What's the first thing to check, and how?",
          a: "CPU fallback. Run nvidia-smi and confirm your inference process is listed under GPU compute processes with allocated memory and GPU-Util > 0 during generation. If it isn't there, you're on the CPU, a wrong-arch (non-sm_121) build." },
        { q: "Why keep a fast 9B as the daily driver and reserve the 120B for escalation?",
          a: "The 9B is bandwidth-cheap, fits with huge headroom, and stays warm for snappy tool-calling loops. The 120B is slow per token but uniquely capable, you call it occasionally for hard reasoning, not for every turn." }
      ]
    },

    /* ========================================================== DAY 3 */
    {
      n: 3,
      title: "Wrap it in an orchestrator you can reach",
      goal: "Put one clean API and a UI in front, turn it into a tool-using agent, then make it durable and reachable from anywhere.",
      why: "This is the payoff. An orchestrator is a capable model calling tools in a loop and escalating hard reasoning to your big model, and a thing that only runs while you babysit it isn't infrastructure. Today you build the interface once, wire the agent loop, and make it survive reboots and reach you safely.",
      steps: [
        { label: "Put LiteLLM in front as a gateway", detail: {
          headline: "One URL that speaks OpenAI for every model",
          body: "LiteLLM proxies all your backends (vLLM, Ollama) behind a single OpenAI-compatible endpoint like <code>http://spark.local:4000/v1</code>. Now switching models is a parameter, not a re-wire, and you can add keys, rate limits, and logging in one place.",
          watchOut: "Set an API key on the gateway even on your LAN; it's the seam you'll later expose via Tailscale.",
          commands: ["pip install litellm[proxy]", "litellm --config litellm.config.yaml --port 4000"] } },
        { label: "Add llama-swap for on-demand loading", detail: {
          headline: "Load/unload models so they share the 121GB",
          body: "llama-swap loads a model when requested and unloads it when idle, so your S/M/L tiers can share memory instead of fighting for it. Combined with LiteLLM, you get many 'virtual' models on one box without OOM.",
          watchOut: "Cold model switches cost seconds. Keep your daily driver pinned/warm; let the heavy model swap in on demand.",
          commands: ["# llama-swap config maps model-name → backend cmd", "# pin the 9B daily driver; lazy-load the 120B"] } },
        { label: "Add Open WebUI as your front end", detail: {
          headline: "A real chat UI for you and the LAN",
          body: "Open WebUI gives you a polished, multi-model chat interface pointed at the LiteLLM endpoint: conversations, system prompts, document upload. This is the 'something I can talk to' made tangible.",
          watchOut: "Point Open WebUI at the LiteLLM URL (not directly at vLLM) so it inherits every model and your auth.",
          commands: ["docker run -d -p 3000:8080 \\", "  -e OPENAI_API_BASE_URL=http://spark.local:4000/v1 \\", "  ghcr.io/open-webui/open-webui:main"] } },
        { label: "Prove portability from an external client", detail: {
          headline: "Any OpenAI client should 'just work'",
          body: "Point any OpenAI-compatible tool (a script, an IDE plugin, a CLI) at your endpoint by setting the base URL and key. When an unmodified OpenAI client talks to your box, the abstraction is real.",
          watchOut: "If a client hard-codes api.openai.com, override OPENAI_BASE_URL / OPENAI_API_BASE in its env.",
          commands: ["export OPENAI_BASE_URL=http://spark.local:4000/v1", "export OPENAI_API_KEY=<your-litellm-key>", "# now any OpenAI SDK call hits your Spark"] } },
        { label: "Run a local agent (Hermes / Ollama playbook)", detail: {
          headline: "A working tool-using agent on the box",
          body: "Use NVIDIA's local agent playbook, e.g. running Nous Research's <b>Hermes Agent</b> fully locally via Ollama, step by step, or point any agent framework at your LiteLLM endpoint. The goal is a loop: model → picks a tool → acts → observes → repeats.",
          watchOut: "Start with the vendor playbook to get a known-good loop, then swap in your own models/tools once it runs.",
          commands: ["# NVIDIA DGX Spark Ollama agent playbook", "# or: point your agent framework's base_url at :4000/v1"],
          link: { text: "NVIDIA: run Hermes Agent locally on DGX Spark", url: "https://x.com/NVIDIARTXSpark/status/2055317325444710872" } } },
        { label: "Give it tools via MCP", detail: {
          headline: "Filesystem, web, shell, your APIs",
          body: "Tools are what turn a chatbot into an orchestrator. Wire MCP servers (filesystem, web-fetch, shell, your own services) so the agent can actually <i>do</i> things. The orchestrator pattern: a cheap fast model drives the loop and calls out to the 120B only for hard planning.",
          watchOut: "Scope tool permissions deliberately; a shell tool on an autonomous loop is powerful and dangerous. Start read-only, expand as you trust it.",
          commands: ["# attach MCP servers: filesystem, fetch, shell, custom", "# pattern: Nemotron-9B drives → escalates planning → 120B"] } },
        { label: "Define one real job", detail: {
          headline: "Give it something worth doing",
          body: "Pick a single concrete task: 'watch this folder and summarize new files,' 'triage these GitHub issues,' or 'research a topic and draft a brief.' A real job forces the loop, the tools, and the model choice to actually fit together.",
          watchOut: "One job done well beats five half-wired demos. Make it end-to-end before adding a second.",
          commands: [] } },
        { label: "Test tool-call reliability & escalation", detail: {
          headline: "Trust, but verify the loop",
          body: "Confirm your daily driver emits <b>clean, parseable tool calls</b> reliably before you let it run unattended. If it's flaky on tool syntax, route the planning step to the bigger model and let the small one execute.",
          watchOut: "Tool-calling reliability tracks model quality. If the 9B fumbles structured calls, escalate planning to the 70B/120B rather than fighting it.",
          commands: ["# log every tool call; check for malformed JSON", "# if flaky → planner=120B, executor=9B"] } },
        { label: "Persist everything as services", detail: {
          headline: "Reboot-proof the stack",
          body: "Run vLLM, LiteLLM, and Open WebUI as <b>systemd services or containers with restart policies</b> so a power blip or reboot brings the whole orchestrator back automatically. Infrastructure restarts itself.",
          watchOut: "Test it for real: reboot the box and confirm every service comes back without you touching a terminal.",
          commands: ["# docker: --restart unless-stopped", "sudo systemctl enable --now litellm vllm open-webui", "sudo reboot   # then verify all came back"] } },
        { label: "Remote access the safe way (Tailscale)", detail: {
          headline: "Reach it anywhere without exposing a port",
          body: "Install Tailscale (or WireGuard) so you can reach your orchestrator from your laptop or phone over a private mesh, <b>without exposing a single port to the public internet</b>. Your endpoint stays invisible to the world.",
          watchOut: "Never port-forward the raw inference endpoint. If you must use a public reverse proxy, put real auth in front of it.",
          commands: ["curl -fsSL https://tailscale.com/install.sh | sh", "sudo tailscale up", "# now reach spark over the tailnet, no open ports"] } },
        { label: "Ship one real workflow", detail: {
          headline: "Make it earn its desk space",
          body: "Pick the use case that justifies the box and ship it end-to-end: <b>RAG over your own documents</b>, a <b>coding orchestrator</b>, or a <b>scheduled daily agent</b> (briefing, triage, monitoring). One real, recurring win is the whole point.",
          watchOut: "Recurring + valuable beats clever. A boring agent you use daily is worth more than an impressive one you run once.",
          commands: [] } },
        { label: "Light monitoring + baseline tok/s", detail: {
          headline: "Know normal so you notice broken",
          body: "Record your baseline tok/s per model and keep an eye on nvidia-smi and service logs. When something regresses (a bad update, a wrong-arch rebuild), you'll catch it because you know what 'good' looks like.",
          watchOut: "If tok/s suddenly drops, your first suspect is CPU fallback again, re-run the Day 2 GPU-offload check.",
          commands: ["watch -n2 nvidia-smi", "# note tok/s per model in models.md as your baseline"] } }
      ],
      watchOuts: [
        "llama-swap cold switches cost seconds, fine for orchestration, annoying for rapid manual flipping. Keep the daily driver warm.",
        "An autonomous loop with a shell/filesystem tool can do real damage. Start with least-privilege tools and human-in-the-loop confirmation.",
        "Never put the raw inference endpoint on the open internet: Tailscale/WireGuard for remote, auth on any proxy, always.",
        "It's a real appliance (~300W peak): give it airflow and a stable spot."
      ],
      win: "A reboot-proof, remotely-reachable local AI orchestrator doing one valuable job for you. That's the finish line.",
      learn: {
        predicts: [
          { prompt: "You point an unmodified OpenAI client at your box by changing only the base URL and the key. Predict: does it work? Why or why not?",
            reveal: "<b>It works</b>, because LiteLLM speaks the exact OpenAI wire format, so the client cannot tell it isn't talking to OpenAI. That interchangeability is the entire reason to put a gateway in front: your box becomes a drop-in for any OpenAI tool." },
          { prompt: "You give the 9B a shell tool and a goal. Before running it, predict the two most likely failure modes.",
            reveal: "<b>(1) Malformed / unparseable tool calls</b> (tracks model quality, the 9B may fumble structured output). <b>(2) It does something destructive</b> because the tool is over-privileged. Mitigations: escalate planning to the bigger model, and start tools least-privilege with human-in-the-loop confirmation." },
          { prompt: "You reboot the box right now. Predict exactly what comes back on its own, and what you'd lose without systemd or container restart policies.",
            reveal: "With nothing made persistent: <b>nothing comes back</b>. You'd SSH in and relaunch vLLM, LiteLLM, and Open WebUI by hand after every reboot. Persistence is what turns 'a demo I babysit' into 'infrastructure that survives a power blip.'" }
        ],
        feynmans: [
          { prompt: "A skeptical friend asks: 'why not just call Ollama directly?' Explain what the single OpenAI-compatible endpoint actually buys you.",
            reference: "One seam for auth, logging, and rate limits; model-switching becomes a parameter instead of a re-wire; and every existing OpenAI tool works unchanged. You build the interface once and reuse it for every future client and agent." },
          { prompt: "Explain what makes something an 'orchestrator' rather than a chatbot.",
            reference: "It calls tools in a loop to take real actions and chains steps toward a goal, escalating hard reasoning when needed, instead of just answering a prompt. The loop and the tools are the difference, not the model." },
          { prompt: "Someone says 'it's fine to port-forward the endpoint, it's behind a password.' Explain why you still never expose the raw inference port.",
            reference: "An open inference port is a public attack surface: prompt-injection, resource abuse, and data exfiltration, and auth bugs happen. A private mesh like Tailscale means there is <i>no public port to attack at all</i>. That's defense by absence, which is stronger than defense by password." }
        ],
        sketches: [
          { prompt: "Draw the call path: your client → LiteLLM (:4000) → llama-swap → {vLLM | Ollama}. Mark where auth lives and where models load and unload.",
            reference: "client --(OpenAI API + key)--> LiteLLM:4000 [auth + logging + limits live HERE] --> llama-swap [loads/unloads models to share the 121GB] --> vLLM (throughput) or Ollama (convenience). Open WebUI is just another client pointed at :4000." },
          { prompt: "Draw the agent loop: model → choose tool → act → observe → repeat, with an escalation arrow to the big model for the hard planning step.",
            reference: "goal → [9B model decides next action] → [call tool: fs / web / shell] → [observe result] → loop back to the model → ... → done. Side branch: when a step needs hard reasoning, [escalate that one call → 120B planner] → return plan → 9B resumes the loop." }
        ],
        faildrills: [
          { prompt: "Reboot the box on purpose. Did every service come back without you touching a terminal? Whatever didn't is your persistence gap, find it now while it's cheap.",
            reveal: "If a service didn't return, its unit isn't enabled (or its container lacks <code>--restart unless-stopped</code>). Fix it, reboot again, and confirm. A persistence gap you discover on a test reboot costs minutes; one you discover during real use costs trust." }
        ],
        rebuilds: [
          "From memory, list what each layer is responsible for: LiteLLM, llama-swap, Open WebUI. One sentence each, no peeking.",
          "Without notes, define one real job end-to-end: the goal, the exact tools it needs, and which model plans versus which executes.",
          "From memory, write your 'make it real infrastructure' checklist: persistence, safe remote access, the one valuable job, and a monitoring baseline."
        ]
      },
      recalls: [
        { q: "What does putting LiteLLM in front of vLLM/Ollama buy you?",
          a: "A single OpenAI-compatible endpoint for every model, with one place for auth, logging, and limits, so any client or agent framework works unchanged, and switching models becomes a parameter instead of a re-wire." },
        { q: "Describe the 'cheap driver, expensive escalation' orchestrator pattern.",
          a: "A fast small model (Nemotron-9B) runs the tool-calling loop for most steps; when a step needs hard reasoning or reliable planning, it escalates that single call to the big 70B/120B model, getting speed for the loop and capability where it counts." },
        { q: "What's the safe way to reach your orchestrator from your phone, and what must you never do?",
          a: "Use a private mesh VPN like Tailscale/WireGuard so the endpoint is reachable without any open ports. Never port-forward the raw inference endpoint to the public internet; if a public proxy is unavoidable, put real auth in front of it." }
      ]
    }
  ],

  // Sources & credits, shown on the finish slide. Edit freely.
  credits: {
    intro: "Honest framing: this deck aggregates and synthesizes community knowledge about the DGX Spark. The technical substance belongs to the people and resources below; the curriculum, the writing, the learning method, and the platform are original. Corrections and additions welcome.",
    items: [
      { name: "Matt Pocock, the teach skill", role: "The teaching-workspace approach that started this whole project.", url: "https://github.com/mattpocock" },
      { name: "Matt Van Horn, the /last30days skill", role: "Used to aggregate what the community is actually saying across Reddit, X, Hacker News, GitHub, and the web.", url: "https://github.com/mvanhorn/last30days-skill" },
      { name: "KubeSimplify, “7 Days of DGX Spark”", role: "Primary external walkthrough series; recommended reading on Day 1.", url: "https://blog.kubesimplify.com/series/7-days-of-dgx-spark" },
      { name: "llama.cpp, DGX Spark performance discussion", role: "Source of the sm_121 CPU-fallback diagnosis.", url: "https://github.com/ggml-org/llama.cpp/discussions/16578" },
      { name: "NVIDIA, DGX Spark agent playbooks", role: "Ollama / Hermes local-agent setup and tuned model defaults.", url: "https://x.com/NVIDIARTXSpark/status/2055317325444710872" }
    ],
    note: "Built and visually polished with the impeccable design skill. Learning method grounded in established cognitive science: desirable difficulty, retrieval practice, the Feynman technique, and the spacing effect."
  },

  // Final retrieval round, spaced practice pulling across all three days.
  finalRecall: [
    { q: "One sentence: what is your box good at, and what is it bad at?", a: "Good at capacity, holding big models resident and serving high concurrency. Bad at single-stream speed, because it's memory-bandwidth-limited (~273 GB/s)." },
    { q: "The silent failure that wastes the hardware, name it and the one-command check.", a: "CPU fallback from a wrong-arch (non-sm_121) build. Check with nvidia-smi: your inference process must appear under GPU compute with GPU-Util > 0." },
    { q: "Why build everything behind a single OpenAI-compatible URL?", a: "So any client or agent framework works unchanged, with one place for auth/logging/limits, and switching models becomes a parameter, build the interface once, reuse forever." },
    { q: "The orchestrator pattern in one line.", a: "A fast small model drives the tool-calling loop and escalates only the hard planning steps to the big model." },
    { q: "Two non-negotiables for making it real infrastructure.", a: "Persistence (systemd/containers that restart on reboot) and safe remote access (Tailscale/WireGuard, never a raw open port)." }
  ]
};
