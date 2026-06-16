/* ============================================================
   The 3-Day DGX Spark Path, engine
   Vanilla JS, no build step, no dependencies. Opens via file://.
   ============================================================ */
(function () {
  "use strict";

  const LS_KEY = "dgx3.v1";
  const D = CURRICULUM;
  const TOTAL_SLIDES = D.days.length + 2; // intro + N days + finish
  let current = 0;

  // ---- persistence ----------------------------------------------------------
  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch { return {}; }
  }
  function save(s) {
    s.updatedAt = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    schedulePush();
  }
  let state = load();
  function ensureShape(s) {
    s.checked = s.checked || {};   // { "d1s0": true, ... }
    s.notes = s.notes || {};       // Feynman explain-back text, by "d{n}.note"
    s.reveal = s.reveal || {};     // which blur-gates have been opened
    s.rebuilt = s.rebuilt || {};   // unguided-rebuild marked done, by day
    return s;
  }
  ensureShape(state);

  function stepId(day, i) { return "d" + day + "s" + i; }
  function dayDone(day) {
    const d = D.days.find(x => x.n === day);
    return d.steps.every((_, i) => state.checked[stepId(day, i)]);
  }
  function totalChecked() {
    let n = 0, t = 0;
    D.days.forEach(d => d.steps.forEach((_, i) => { t++; if (state.checked[stepId(d.n, i)]) n++; }));
    return { n, t };
  }

  // ---- helpers --------------------------------------------------------------
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ---- cross-device sync (Cloudflare KV via /api/state) ---------------------
  // Local-first: the UI always runs from localStorage; the server is a mirror
  // keyed by a personal sync code you carry between devices.
  const SYNC_CODE_KEY = "dgx7.synccode";
  let pushTimer = null;
  let syncStatus = "local"; // local | syncing | synced | offline

  function getSyncCode() { return localStorage.getItem(SYNC_CODE_KEY) || ""; }
  function setSyncCode(c) { localStorage.setItem(SYNC_CODE_KEY, c); }
  function genCode() { return "spark-" + Math.random().toString(36).slice(2, 8); }
  function apiURL(code) { return "/api/state/" + encodeURIComponent(code); }

  function setSyncStatus(s) {
    syncStatus = s;
    const dot = document.getElementById("syncDot");
    if (dot) dot.dataset.status = s;
  }

  function schedulePush() {
    const code = getSyncCode();
    if (!code) return; // sync not set up yet -> stay purely local
    clearTimeout(pushTimer);
    setSyncStatus("syncing");
    pushTimer = setTimeout(pushNow, 600);
  }
  async function pushNow() {
    const code = getSyncCode();
    if (!code) return;
    try {
      const r = await fetch(apiURL(code), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      setSyncStatus(r.ok ? "synced" : "offline");
    } catch { setSyncStatus("offline"); }
  }

  // Pull remote state. adopt=true forces taking the server copy (device pairing);
  // otherwise newer-wins by updatedAt. Returns true if local state was replaced.
  async function pullState(adopt) {
    const code = getSyncCode();
    if (!code) return false;
    setSyncStatus("syncing");
    try {
      const r = await fetch(apiURL(code), { cache: "no-store" });
      if (!r.ok) { setSyncStatus("offline"); return false; }
      const remote = await r.json();
      const hasRemote = remote && Object.keys(remote).length > 0;
      if (hasRemote && (adopt || (remote.updatedAt || 0) > (state.updatedAt || 0))) {
        state = ensureShape(remote);
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        setSyncStatus("synced");
        return true;
      }
      // local is newer (or remote empty): push local up
      setSyncStatus("synced");
      pushNow();
      return false;
    } catch { setSyncStatus("offline"); return false; }
  }

  // Re-apply the whole state object onto the already-rendered DOM (no rebuild).
  function applyStateToDom() {
    document.querySelectorAll(".step[data-id]").forEach(row => {
      const on = !!state.checked[row.dataset.id];
      row.classList.toggle("checked", on);
      row.setAttribute("aria-checked", on ? "true" : "false");
    });
    document.querySelectorAll(".u-note[data-id]").forEach(ta => {
      ta.value = state.notes[ta.dataset.id] || "";
      const saved = document.querySelector('.u-saved[data-for="' + ta.dataset.id + '"]');
      if (saved) saved.textContent = ta.value ? "saved" : "";
    });
    document.querySelectorAll(".reveal-box[data-key]").forEach(box => {
      box.classList.toggle("shown", !!state.reveal[box.dataset.key]);
    });
    document.querySelectorAll(".u-rebuild[data-rkey]").forEach(rb => {
      const on = !!state.rebuilt[rb.dataset.rkey];
      rb.classList.toggle("done", on);
      const btn = rb.querySelector(".u-rebuild-check");
      if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    refreshProgress();
    refreshRail();
  }

  // ---- build slides ---------------------------------------------------------
  const slidesEl = document.getElementById("slides");

  function buildIntro() {
    const s = el("section", "slide");
    const stats = totalChecked();
    s.innerHTML = `
      <div class="slide-inner hero">
        <div class="kicker">NVIDIA DGX Spark · GB10</div>
        <h1>${esc(D.title).replace("DGX Spark", '<span class="grad">DGX Spark</span>')}</h1>
        <p class="sub">${D.subtitle}</p>
        <div class="mental">
          <h3>The one mental model for all three days</h3>
          <p>${D.mentalModel}</p>
        </div>
        <button class="cta" id="startBtn">Begin Day 1 &nbsp;→</button>
        <div class="spec-strip">
          <span><b>3</b> days</span>
          <span><b>${stats.t}</b> interactive steps</span>
          <span><b>128 GB</b> unified memory</span>
          <span><b>273 GB/s</b> bandwidth</span>
        </div>
        <div style="margin-top:26px;color:var(--ink-faint);font-size:12.5px">
          Use ← → arrows or the day rail to navigate · click any step to check it off · tap <b style="color:var(--green-glow)">ⓘ Learn</b> for the deep dive
        </div>
      </div>`;
    s.querySelector("#startBtn").onclick = () => go(1);
    return s;
  }

  function buildDay(d) {
    const s = el("section", "slide");
    const inner = el("div", "slide-inner");

    // header
    inner.appendChild(el("div", "day-head",
      `<span class="day-num">DAY ${d.n} / ${D.days.length}</span><div><h2>${esc(d.title)}</h2></div>`));
    inner.appendChild(el("p", "goal", esc(d.goal)));
    inner.appendChild(el("div", "why", `<span class="tag">Why this matters</span>${d.why}`));

    // checklist
    inner.appendChild(el("p", "section-label", "Walk the checklist"));
    const list = el("div", "checklist");
    d.steps.forEach((step, i) => {
      const id = stepId(d.n, i);
      const row = el("div", "step" + (state.checked[id] ? " checked" : ""));
      row.dataset.id = id;
      row.tabIndex = 0;
      row.setAttribute("role", "checkbox");
      row.setAttribute("aria-checked", state.checked[id] ? "true" : "false");
      row.setAttribute("aria-label", "Step " + (i + 1) + ": " + step.label);
      row.innerHTML = `
        <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="#06210a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg></div>
        <div class="step-label"><span class="num">${String(i + 1).padStart(2, "0")}</span>${esc(step.label)}</div>
        <button class="learn-btn">Learn</button>`;
      const toggle = () => {
        state.checked[id] = !state.checked[id];
        row.classList.toggle("checked", state.checked[id]);
        row.setAttribute("aria-checked", state.checked[id] ? "true" : "false");
        save(state); refreshProgress(); refreshRail();
        if (state.checked[id] && dayDone(d.n)) celebrate(row);
      };
      // toggle by clicking the row (but not the learn button)
      row.addEventListener("click", e => {
        if (e.target.closest(".learn-btn")) return;
        toggle();
      });
      // keyboard: Enter/Space toggles the step
      row.addEventListener("keydown", e => {
        if (e.target.closest(".learn-btn")) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      row.querySelector(".learn-btn").addEventListener("click", () => openModal(d, step, i));
      list.appendChild(row);
    });
    inner.appendChild(list);

    // watch-outs
    if (d.watchOuts && d.watchOuts.length) {
      const c = el("div", "callout watch");
      c.innerHTML = `<div class="head">Watch out</div><ul>${d.watchOuts.map(w => `<li>${w}</li>`).join("")}</ul>`;
      inner.appendChild(c);
    }

    // understanding layer (the effortful core)
    if (d.learn) inner.appendChild(buildUnderstanding(d));

    // win
    inner.appendChild(el("div", "win",
      `<div class="trophy">🏁</div><div class="txt"><b>Day ${d.n} win</b><span>${esc(d.win)}</span></div>`));

    // recall flip cards (one or more)
    const recalls = d.recalls || (d.recall ? [d.recall] : []);
    if (recalls.length) {
      inner.appendChild(el("p", "section-label", "Self-check before you move on"));
      recalls.forEach(rc => {
        const r = el("div", "recall");
        r.innerHTML = `
          <div class="recall-inner">
            <div class="recall-face recall-front">
              <div class="tag">Active recall</div>
              <div class="q">${esc(rc.q)}</div>
              <div class="hint">Think it through, then flip</div>
            </div>
            <div class="recall-face recall-back">
              <div class="tag">Answer</div>
              <div class="a">${esc(rc.a)}</div>
              <div class="hint">Flip back</div>
            </div>
          </div>`;
        r.addEventListener("click", () => r.classList.toggle("flipped"));
        inner.appendChild(r);
      });
    }

    s.appendChild(inner);
    return s;
  }

  // a blur-gated reveal: content hidden until the learner commits and clicks
  function revealBox(key, gateLabel, innerHTML) {
    const shown = state.reveal[key] ? " shown" : "";
    return `<div class="reveal-box${shown}" data-key="${key}">
        <div class="reveal-content">${innerHTML}</div>
        <button class="reveal-gate" type="button">🔒 ${gateLabel}</button>
      </div>`;
  }

  function buildUnderstanding(d) {
    const L = d.learn;
    const sec = el("section", "ulayer");
    let html = `
      <div class="u-head">
        <span class="u-badge">Understanding layer</span>
        <p class="u-intro">The checklist is the doing. This is the learning. Effortful retrieval (predict, explain, rebuild) is what makes it stick, so resist peeking until you've committed an answer.</p>
      </div>`;

    (L.predicts || []).forEach((p, i) => {
      html += `<div class="u-card">
        <div class="u-kind u-kind-predict">Predict before you run</div>
        <div class="u-prompt">${p.prompt}</div>
        ${revealBox("d" + d.n + ".predict" + i, "Reveal what actually happens", p.reveal)}
      </div>`;
    });
    (L.faildrills || []).forEach((f, i) => {
      html += `<div class="u-card">
        <div class="u-kind u-kind-fail">Make it fail, then diagnose</div>
        <div class="u-prompt">${f.prompt}</div>
        ${revealBox("d" + d.n + ".fail" + i, "Reveal the tells", f.reveal)}
      </div>`;
    });
    (L.sketches || []).forEach((s, i) => {
      html += `<div class="u-card">
        <div class="u-kind u-kind-sketch">Sketch it yourself</div>
        <div class="u-prompt">${s.prompt}</div>
        ${revealBox("d" + d.n + ".sketch" + i, "Reveal reference sketch", '<div class="u-sketch-ref">' + esc(s.reference) + '</div>')}
      </div>`;
    });
    (L.feynmans || []).forEach((f, i) => {
      const noteId = "d" + d.n + ".note" + i;
      const val = state.notes[noteId] ? esc(state.notes[noteId]) : "";
      html += `<div class="u-card">
        <div class="u-kind u-kind-feynman">Explain it back, in your own words</div>
        <div class="u-prompt">${f.prompt}</div>
        <textarea class="u-note" data-id="${noteId}" rows="3" placeholder="Say it out loud, then type it here before you check. If you can't explain it simply, you've found the gap.">${val}</textarea>
        <div class="u-note-meta"><span class="u-saved" data-for="${noteId}">${val ? "saved" : ""}</span></div>
        ${revealBox("d" + d.n + ".feynref" + i, "Show a reference explanation", f.reference)}
      </div>`;
    });
    (L.rebuilds || []).forEach((rb, i) => {
      const rkey = "d" + d.n + ".rb" + i;
      const done = state.rebuilt[rkey] ? " done" : "";
      html += `<div class="u-card u-rebuild${done}" data-rkey="${rkey}">
        <button class="u-rebuild-check" type="button" aria-pressed="${state.rebuilt[rkey] ? "true" : "false"}">
          <span class="u-rebuild-box"><svg viewBox="0 0 24 24" fill="none" stroke="#06210a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg></span>
          <span class="u-kind u-kind-rebuild">Rebuild it unguided</span>
        </button>
        <div class="u-prompt">${esc(rb)}</div>
      </div>`;
    });

    sec.innerHTML = html;

    // wire blur-gate reveals
    sec.querySelectorAll(".reveal-box").forEach(box => {
      const gate = box.querySelector(".reveal-gate");
      gate.addEventListener("click", () => {
        box.classList.add("shown");
        state.reveal[box.dataset.key] = true;
        save(state);
      });
    });

    // wire Feynman note persistence
    sec.querySelectorAll(".u-note").forEach(ta => {
      let t;
      ta.addEventListener("input", () => {
        state.notes[ta.dataset.id] = ta.value;
        const saved = sec.querySelector('.u-saved[data-for="' + ta.dataset.id + '"]');
        clearTimeout(t);
        if (saved) saved.textContent = "saving…";
        t = setTimeout(() => { save(state); if (saved) saved.textContent = ta.value ? "saved" : ""; }, 350);
      });
    });

    // wire rebuild checkboxes (one or more)
    sec.querySelectorAll(".u-rebuild").forEach(rb => {
      const btn = rb.querySelector(".u-rebuild-check");
      btn.addEventListener("click", () => {
        const k = rb.dataset.rkey;
        state.rebuilt[k] = !state.rebuilt[k];
        rb.classList.toggle("done", state.rebuilt[k]);
        btn.setAttribute("aria-pressed", state.rebuilt[k] ? "true" : "false");
        save(state);
      });
    });

    return sec;
  }

  function buildFinish() {
    const s = el("section", "slide");
    const cards = D.finalRecall.map(c => `
      <div class="recall">
        <div class="recall-inner">
          <div class="recall-face recall-front">
            <div class="tag">Retrieval round</div>
            <div class="q">${esc(c.q)}</div>
            <div class="hint">Recall, then flip</div>
          </div>
          <div class="recall-face recall-back">
            <div class="tag">Answer</div>
            <div class="a">${esc(c.a)}</div>
            <div class="hint">Flip back</div>
          </div>
        </div>
      </div>`).join("");
    const cr = D.credits;
    const creditsHTML = cr ? `
      <div class="credits">
        <p class="section-label" style="text-align:left">Sources &amp; credits</p>
        <p class="credits-intro">${esc(cr.intro)}</p>
        <ul class="credits-list">
          ${cr.items.map(it => `
            <li>
              <a class="credits-link" href="${it.url}" target="_blank" rel="noopener">${esc(it.name)} ↗</a>
              <span class="credits-role">${esc(it.role)}</span>
            </li>`).join("")}
        </ul>
        ${cr.note ? `<p class="credits-note">${esc(cr.note)}</p>` : ""}
      </div>` : "";
    s.innerHTML = `
      <div class="slide-inner finish">
        <div class="medal">🏆</div>
        <div class="big">You built a <span class="grad">local orchestrator</span></div>
        <p>Reboot-proof, reachable from anywhere over Tailscale, doing one valuable job on its own. Before you go, a spaced retrieval round across all three days. The flip is the learning.</p>
        <div class="retrieval">${cards}</div>
        ${creditsHTML}
        <button class="cta" id="topBtn">↑ Back to the top</button>
        <div><button class="reset-link" id="resetBtn">Reset all progress</button></div>
      </div>`;
    s.querySelectorAll(".recall").forEach(r => r.addEventListener("click", () => r.classList.toggle("flipped")));
    s.querySelector("#topBtn").onclick = () => go(0);
    s.querySelector("#resetBtn").onclick = () => {
      if (confirm("Reset every checkbox and start fresh?")) {
        state = { checked: {} }; save(state);
        document.querySelectorAll(".step.checked").forEach(x => x.classList.remove("checked"));
        refreshProgress(); refreshRail();
      }
    };
    return s;
  }

  // render all
  slidesEl.appendChild(buildIntro());
  D.days.forEach(d => slidesEl.appendChild(buildDay(d)));
  slidesEl.appendChild(buildFinish());
  const slideNodes = Array.from(slidesEl.children);

  // ---- day rail -------------------------------------------------------------
  const railEl = document.getElementById("rail");
  D.days.forEach(d => {
    const b = el("button");
    const lbl = d.title.replace(/,/g, "").split(/\s+/).slice(0, 2).join(" ");
    b.innerHTML = `<span class="pip">${d.n}</span><span class="lbl">${esc(lbl)}</span>`;
    b.onclick = () => go(d.n);
    b.dataset.day = d.n;
    railEl.appendChild(b);
  });
  function refreshRail() {
    railEl.querySelectorAll("button").forEach(b => {
      const day = +b.dataset.day;
      b.classList.toggle("active", current === day);
      b.classList.toggle("done", dayDone(day));
    });
  }

  // ---- progress -------------------------------------------------------------
  const fill = document.getElementById("progressFill");
  const plabel = document.getElementById("progressLabel");
  function refreshProgress() {
    const { n, t } = totalChecked();
    const pct = t ? Math.round((n / t) * 100) : 0;
    fill.style.width = pct + "%";
    plabel.textContent = `${n}/${t} steps · ${pct}%`;
  }

  // ---- navigation -----------------------------------------------------------
  function go(idx) {
    current = Math.max(0, Math.min(TOTAL_SLIDES - 1, idx));
    slidesEl.style.transform = `translateX(-${current * 100}%)`;
    slideNodes.forEach((n, i) => n.classList.toggle("enter", i === current));
    // restart enter animation
    const active = slideNodes[current];
    active.classList.remove("enter"); void active.offsetWidth; active.classList.add("enter");
    active.scrollTop = 0;
    refreshRail();
    document.getElementById("prevBtn").disabled = current === 0;
    const next = document.getElementById("nextBtn");
    next.textContent = current >= TOTAL_SLIDES - 1 ? "Done ✓" : (current === 0 ? "Start →" : "Next →");
    next.disabled = current >= TOTAL_SLIDES - 1;
    const hash = current === 0 ? "#start" : current === TOTAL_SLIDES - 1 ? "#done" : "#day-" + current;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }
  function slideFromHash() {
    const m = /^#day-(\d+)$/.exec(location.hash);
    if (m) return Math.min(D.days.length, Math.max(1, +m[1]));
    if (location.hash === "#done") return TOTAL_SLIDES - 1;
    return 0;
  }
  document.getElementById("prevBtn").onclick = () => go(current - 1);
  document.getElementById("nextBtn").onclick = () => go(current + 1);

  document.addEventListener("keydown", e => {
    if (document.querySelector(".scrim.open")) { if (e.key === "Escape") closeModal(); return; }
    if (document.querySelector(".drawer.open")) { if (e.key === "Escape") closeDrawer(); return; }
    if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(TOTAL_SLIDES - 1);
  });

  // ---- modal ----------------------------------------------------------------
  const scrim = document.getElementById("scrim");
  function openModal(day, step, i) {
    const det = step.detail || {};
    const cmds = (det.commands || []).map((c, k) => `
      <div class="cmd"><code>${esc(c)}</code><button class="copy" data-cmd="${esc(c)}">Copy</button></div>`).join("");
    scrim.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <span class="mtag">D${day.n} · ${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(det.headline || step.label)}</h3>
          <button class="modal-x" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>${det.body || ""}</p>
          ${det.watchOut ? `<div class="modal-watch"><div class="h">⚠ Watch out</div><span>${det.watchOut}</span></div>` : ""}
          ${cmds ? `<div class="cmd-block"><div class="cmd-label">Commands</div>${cmds}</div>` : ""}
          ${det.link ? `<div style="margin-top:14px"><a class="modal-link" href="${det.link.url}" target="_blank" rel="noopener">${esc(det.link.text)}</a></div>` : ""}
        </div>
      </div>`;
    scrim.classList.add("open");
    scrim.querySelector(".modal-x").onclick = closeModal;
    scrim.onclick = e => { if (e.target === scrim) closeModal(); };
    scrim.querySelectorAll(".copy").forEach(btn => {
      btn.onclick = () => {
        const text = btn.dataset.cmd;
        navigator.clipboard && navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied ✓"; btn.classList.add("done");
          setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1400);
        }).catch(() => { btn.textContent = "⌘C"; });
      };
    });
  }
  function closeModal() { scrim.classList.remove("open"); }

  // ---- pinned worries drawer ------------------------------------------------
  const drawer = document.getElementById("drawer");
  const drawerScrim = document.getElementById("drawerScrim");
  const dbody = document.getElementById("drawerBody");
  dbody.innerHTML = D.pinned.map((w, i) => `
    <div class="worry">
      <div class="wt"><span class="n">${String(i + 1).padStart(2, "0")}</span>${esc(w.t)}</div>
      <div class="wd">${w.d}</div>
    </div>`).join("");
  function openDrawer() { drawer.classList.add("open"); drawerScrim.classList.add("open"); }
  function closeDrawer() { drawer.classList.remove("open"); drawerScrim.classList.remove("open"); }
  document.getElementById("worriesBtn").onclick = openDrawer;
  document.getElementById("drawerClose").onclick = closeDrawer;
  drawerScrim.onclick = closeDrawer;

  // ---- sync modal -----------------------------------------------------------
  // add a live status dot inside the Sync button
  (function initSyncButton() {
    const btn = document.getElementById("syncBtn");
    if (btn && !document.getElementById("syncDot")) {
      const dot = document.createElement("span");
      dot.id = "syncDot"; dot.className = "sync-dot"; dot.dataset.status = syncStatus;
      btn.prepend(dot);
    }
  })();

  function openSyncModal() {
    const code = getSyncCode();
    const statusText = {
      local: "Local only on this device", syncing: "Syncing…",
      synced: "Synced across your devices", offline: "Offline (saved locally, will retry)"
    }[syncStatus] || "Local only";
    scrim.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <span class="mtag">Sync</span>
          <h3>Use the same progress on every device</h3>
          <button class="modal-x" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>Your progress, predictions, and notes save to a private <b>sync code</b>. Enter the same code on your phone and laptop to keep them in step. The site is public, but each code's data is separate.</p>
          <div class="sync-status sync-${syncStatus}">${statusText}</div>
          ${code ? `
          <div class="cmd-block"><div class="cmd-label">Your sync code</div>
            <div class="cmd"><code id="syncCodeVal">${esc(code)}</code><button class="copy" id="copyCode">Copy</button></div>
          </div>` : `<p style="color:var(--ink-dim)">No sync code yet. Create one to start syncing, or keep working locally.</p>`}
          <div class="cmd-block" style="margin-top:14px">
            <div class="cmd-label">${code ? "Pair another device" : "Set a sync code"}</div>
            <div class="sync-pair">
              <input id="syncInput" class="sync-input" type="text" autocapitalize="off" autocorrect="off" spellcheck="false"
                placeholder="${code ? "enter a code to switch to it" : "e.g. spark-yourname"}" />
              <button class="copy sync-apply" id="applyCode">${code ? "Switch" : "Start"}</button>
            </div>
            ${code ? "" : `<button class="sync-gen" id="genCodeBtn">Generate one for me</button>`}
          </div>
          <div id="syncMsg" class="sync-msg"></div>
        </div>
      </div>`;
    scrim.classList.add("open");
    scrim.querySelector(".modal-x").onclick = closeModal;
    scrim.onclick = e => { if (e.target === scrim) closeModal(); };

    const copyBtn = scrim.querySelector("#copyCode");
    if (copyBtn) copyBtn.onclick = () => {
      navigator.clipboard && navigator.clipboard.writeText(getSyncCode()).then(() => {
        copyBtn.textContent = "Copied ✓"; copyBtn.classList.add("done");
        setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.classList.remove("done"); }, 1400);
      });
    };
    const genBtn = scrim.querySelector("#genCodeBtn");
    if (genBtn) genBtn.onclick = () => { scrim.querySelector("#syncInput").value = genCode(); };

    const msg = scrim.querySelector("#syncMsg");
    scrim.querySelector("#applyCode").onclick = async () => {
      let v = (scrim.querySelector("#syncInput").value || "").trim().toLowerCase();
      if (!v) { msg.textContent = "Enter or generate a code first."; return; }
      if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(v)) { msg.textContent = "Use 3–41 chars: letters, numbers, hyphens."; return; }
      setSyncCode(v);
      msg.textContent = "Linking to “" + v + "”…";
      const replaced = await pullState(true); // adopt the server copy for this code
      if (replaced) applyStateToDom();
      else { pushNow(); }                      // new/empty code: seed it with local
      msg.textContent = replaced
        ? "Linked. This device now shows that code's progress."
        : "Linked. Your current progress is now saved to this code.";
      setTimeout(openSyncModal, 700);          // refresh the modal to show the code
    };
  }
  document.getElementById("syncBtn").onclick = openSyncModal;

  // ---- celebration micro-feedback ------------------------------------------
  function celebrate(node) {
    const burst = el("div");
    burst.style.cssText = "position:fixed;z-index:80;pointer-events:none;font-size:20px";
    const r = node.getBoundingClientRect();
    burst.style.left = (r.left + 20) + "px";
    burst.style.top = (r.top + 8) + "px";
    burst.textContent = "✨";
    burst.animate(
      [{ transform: "translateY(0) scale(.6)", opacity: 1 }, { transform: "translateY(-40px) scale(1.4)", opacity: 0 }],
      { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 720);
  }

  // ---- init -----------------------------------------------------------------
  refreshProgress();
  go(slideFromHash());
  window.addEventListener("hashchange", () => {
    const target = slideFromHash();
    if (target !== current) go(target);
  });

  // local-first sync: render immediately above, then reconcile with the server
  if (getSyncCode()) {
    pullState(false).then(replaced => { if (replaced) applyStateToDom(); });
  } else {
    setSyncStatus("local");
  }
  // re-sync when returning to the tab (e.g. switched from phone to laptop)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && getSyncCode()) {
      pullState(false).then(replaced => { if (replaced) applyStateToDom(); });
    }
  });
})();
