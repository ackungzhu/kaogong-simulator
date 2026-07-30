/**
 * 《上岸模拟器》 v0.5 · 核心逻辑
 * v0.5: 存档系统 + 模态遮罩 + 执行脉冲 + UI局部更新 + 事件稀有度引擎
 */

// ========== 玩家状态 ==========
const Player = {
  identity: null,
  startMonth: 3,
  // 时间系统
  year: 2026,
  month: 3,
  day: 1,
  hour: 8,                  // 当天当前时刻（小时，可为小数 0-24）
  daysPlayed: 0,
  totalDays: 12 * 30,
  // 体力 & 睡眠
  ap: 4,
  apMax: 4,
  sleepStart: 23,           // 昨晚入睡时刻（小时）
  sleepHours: 8,            // 昨晚睡了多少小时
  consecutiveEarly: 0,      // 连续早起天数
  consecutiveLazy: 0,       // 连续赖床次数（基于"再赖床15分钟"机制）
  // 数值
  stats: { study: 50, mood: 50, money: 50, relation: 50, sanity: 50 },
  // 标签 / 路线 / 搭子
  lifeTags: [],             // 人生标签数组
  path: null,
  partners: [],
  achievements: new Set(),
  usedEvents: new Set(),
  aiEventUsed: false,
  actionLog: [],
  // 内部
  pendingWake: true,        // 当天是否还需选择起床
  nightAlarm: 8,            // 闹钟设置时间
};

// ========== 节日/里程碑 ==========
const MILESTONES = [
  { month: 3, day: 15, name: "省考公告发布", desc: "岗位表一出，乾坤已定。", type: "ganggao" },
  { month: 4, day: 20, name: "省考笔试", desc: "笔试日。破釜沉舟。", type: "bishi_sheng" },
  { month: 5, day: 1,  name: "五一假期", desc: "别人在旅游，你在背范文。", type: "wuyi" },
  { month: 6, day: 10, name: "省考面试/出分", desc: "笔试分数出了。", type: "chufen_sheng" },
  { month: 8, day: 15, name: "中秋·家族团聚", desc: "灵魂拷问预警。", type: "zhongqiu" },
  { month: 10,day: 15, name: "国考报名开始", desc: "千军万马，岗位表上线。", type: "guokao_baoming" },
  { month: 11,day: 28, name: "国考笔试", desc: "最后一搏。", type: "bishi_guo" },
  { month: 2, day: 2,  name: "过年", desc: "亲戚灵魂三连问。", type: "chunjie" },
];

// ========== 工具 ==========
const $ = (id) => document.getElementById(id);
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randRange(min, max) { return min + Math.random() * (max - min); }
function fmtHour(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
}
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}
function toast(msg, type = "normal", duration = 1800) {
  const t = $("toast");
  t.textContent = msg;
  t.className = type === "achievement" ? "show achievement" : "show";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), duration);
}

// ========== 存档系统 (P0) ==========
const SaveSystem = {
  KEY: "kaogong_save",
  metaKey: "kaogong_meta",
  autoSave(reason = "") {
    const data = {
      version: 1,
      timestamp: Date.now(),
      reason,
      player: {
        identity: Player.identity, startMonth: Player.startMonth,
        year: Player.year, month: Player.month, day: Player.day,
        hour: Player.hour, daysPlayed: Player.daysPlayed, totalDays: Player.totalDays,
        ap: Player.ap, apMax: Player.apMax,
        sleepStart: Player.sleepStart, sleepHours: Player.sleepHours,
        consecutiveEarly: Player.consecutiveEarly, consecutiveLazy: Player.consecutiveLazy,
        stats: { ...Player.stats },
        lifeTags: [...Player.lifeTags], path: Player.path, partners: [...Player.partners],
        achievements: [...Player.achievements],
        usedEvents: [...Player.usedEvents], aiEventUsed: Player.aiEventUsed,
        actionLog: [...Player.actionLog],
        pendingWake: Player.pendingWake, nightAlarm: Player.nightAlarm,
        _examScore: Player._examScore || null,
      }
    };
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      const meta = JSON.parse(localStorage.getItem(this.metaKey) || '{"playCount":0,"totalTime":0,"bestEndings":[]}');
      meta.playCount = (meta.playCount || 0);
      localStorage.setItem(this.metaKey, JSON.stringify(meta));
    } catch(e) { /* quota exceeded, silent fail */ }
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== 1) return null;
      return data;
    } catch(e) { return null; }
  },
  hasSave() { return !!localStorage.getItem(this.KEY); },
  deleteSave() { localStorage.removeItem(this.KEY); },
  loadMeta() {
    try { return JSON.parse(localStorage.getItem(this.metaKey)) || {playCount:0,totalTime:0,bestEndings:[]}; }
    catch(e) { return {playCount:0,totalTime:0,bestEndings:[]}; }
  },
  saveMeta(meta) {
    try { localStorage.setItem(this.metaKey, JSON.stringify(meta)); } catch(e) {}
  }
};

// ========== UI抽象层 (P0) ==========
const UI = {
  _statsCache: {},
  showModal(html, closeable = true) {
    const overlay = $("modalOverlay");
    if (!overlay) return;
    overlay.innerHTML = `<div class="modal-content">${html}${closeable ? '' : ''}</div>`;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  },
  hideModal() {
    const overlay = $("modalOverlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  },
  // 局部更新状态栏数值（不重建DOM）
  renderStatsDiff(changes) {
    const keys = ["study","mood","money","relation","sanity"];
    keys.forEach(k => {
      const el = document.querySelector(`.stat-cell[data-key="${k}"] .stat-value`);
      const bar = document.querySelector(`.stat-cell[data-key="${k}"] .stat-bar-fill`);
      if (el) {
        const val = Player.stats[k];
        el.textContent = val;
        const cell = el.closest(".stat-cell");
        if (cell) {
          cell.classList.remove("low","high");
          if (val <= 25) cell.classList.add("low");
          if (val >= 75) cell.classList.add("high");
        }
      }
      if (bar) { bar.style.width = Player.stats[k] + "%"; }
    });
    // 更新体力点
    const apDots = document.querySelectorAll(".ap-dot");
    apDots.forEach((dot, i) => {
      dot.classList.toggle("spent", i >= Player.ap);
    });
    // 更新日期时钟
    const clock = document.querySelector(".date-clock");
    if (clock) clock.textContent = `⏰ ${fmtHour(Player.hour)}`;
  },
  // 行动卡片执行脉冲
  pulseCard(cardId) {
    const card = document.querySelector(`.action-card[data-action="${cardId}"]`);
    if (!card) return;
    card.classList.add("just-executed");
    setTimeout(() => card.classList.remove("just-executed"), 700);
  }
};
function toast(msg, type = "normal", duration = 1800) {
  const t = $("toast");
  t.textContent = msg;
  t.className = type === "achievement" ? "show achievement" : "show";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), duration);
}

// ========== 主流程 ==========
const Game = {
  init() {
    this.renderIdentities();
    this.renderLifeTags();
    this.renderMonths();
    showScreen("screen-start");
  },

  showIdentity() { showScreen("screen-identity"); },

  renderIdentities() {
    const grid = $("identityGrid");
    grid.innerHTML = IDENTITIES.map(i => `
      <div class="choice-card" data-id="${i.id}" onclick="Game.selectIdentity('${i.id}')">
        <div class="card-check">✓</div>
        <h3>${i.emoji} ${i.name}</h3>
        <div class="card-desc">${i.desc}</div>
        <div class="card-effects">
          📚 ${i.init.study} · ❤️ ${i.init.mood} · 💰 ${i.init.money} · 🤝 ${i.init.relation} · 🧠 ${i.init.sanity}
        </div>
        <div class="card-desc" style="margin-top:8px;color:#8b4513;">${i.extra}</div>
      </div>
    `).join("");
    // 添加底部确认栏
    this.addConfirmBar("identityGrid", "确认身份 →", "Game.confirmIdentity()");
  },

  _selectedIdentity: null,
  selectIdentity(id) {
    this._selectedIdentity = id;
    document.querySelectorAll("#identityGrid .choice-card").forEach(card => {
      if (card.getAttribute("data-id") === id) card.classList.add("selected");
      else card.classList.remove("selected");
    });
  },

  confirmIdentity() {
    if (!this._selectedIdentity) {
      toast("先选一个身份", "normal", 1500);
      return;
    }
    this.pickIdentity(this._selectedIdentity);
  },

  pickIdentity(id) {
    const ident = IDENTITIES.find(i => i.id === id);
    Player.identity = id;
    Object.assign(Player.stats, ident.init);
    if (id === "985") Player.apMax = 5;
    else if (id === "sanben") Player.apMax = 4;
    else if (id === "35plus") Player.apMax = 3;
    Player.ap = Player.apMax;
    this._selectedIdentity = null;
    showScreen("screen-lifetags");
  },

  // ========== 人生标签多选 ==========
  renderLifeTags() {
    const grid = $("lifeTagsGrid");
    if (!grid) return;
    grid.innerHTML = LIFE_TAGS.map(t => {
      const fx = Object.entries(t.delta).map(([k, v]) => {
        const icon = { study: "📚", mood: "❤️", money: "💰", relation: "🤝", sanity: "🧠" }[k];
        return `${icon}${v > 0 ? "+" : ""}${v}`;
      }).join(" ");
      return `
        <div class="lifetag-card" data-id="${t.id}" onclick="Game.toggleLifeTag('${t.id}')">
          <div class="lifetag-stamp" style="display:none;">已选</div>
          <div class="lifetag-top">
            <span class="lifetag-emoji">${t.emoji}</span>
            <span class="lifetag-name">${t.name}</span>
          </div>
          <div class="lifetag-desc">${t.desc}</div>
          <div class="lifetag-fx">${fx}</div>
          <div class="lifetag-perk">${t.perk}</div>
        </div>
      `;
    }).join("");
  },

  toggleLifeTag(id) {
    const idx = Player.lifeTags.indexOf(id);
    if (idx >= 0) {
      Player.lifeTags.splice(idx, 1);
    } else {
      if (Player.lifeTags.length >= 4) {
        toast("最多选 4 个标签", "normal", 1500);
        return;
      }
      Player.lifeTags.push(id);
    }
    document.querySelectorAll(".lifetag-card").forEach(card => {
      const cardId = card.getAttribute("data-id");
      if (Player.lifeTags.includes(cardId)) card.classList.add("selected");
      else card.classList.remove("selected");
    });
    $("lifeTagsCount").textContent = `已选 ${Player.lifeTags.length} / 4`;
  },

  confirmLifeTags() {
    // 应用标签累计影响
    Player.lifeTags.forEach(id => {
      const t = LIFE_TAGS.find(x => x.id === id);
      if (!t) return;
      this.applyEffects(t.delta, false);
    });
    // 显示月份选择
    showScreen("screen-month");
  },

  renderMonths() {
    const grid = $("monthGrid");
    grid.innerHTML = START_MONTHS.map(m => {
      const fx = Object.entries(m.delta).map(([k, v]) => {
        const icon = { study: "📚", mood: "❤️", money: "💰", relation: "🤝", sanity: "🧠" }[k];
        return `${icon}${v > 0 ? "+" : ""}${v}`;
      }).join(" ");
      return `
        <div class="choice-card" data-month="${m.month}" onclick="Game.selectMonth(${m.month})">
          <div class="card-check">✓</div>
          <h3>${m.emoji} ${m.title}</h3>
          <div class="card-desc">「${m.achievement}」</div>
          <div class="card-effects">${fx}</div>
          <div class="card-desc" style="margin-top:6px;">${m.desc}</div>
        </div>
      `;
    }).join("");
    this.addConfirmBar("monthGrid", "确认月份 →", "Game.confirmMonth()");
  },

  _selectedMonth: null,
  selectMonth(month) {
    this._selectedMonth = month;
    document.querySelectorAll("#monthGrid .choice-card").forEach(card => {
      if (parseInt(card.getAttribute("data-month")) === month) card.classList.add("selected");
      else card.classList.remove("selected");
    });
  },

  confirmMonth() {
    if (!this._selectedMonth) {
      toast("先选一个月份", "normal", 1500);
      return;
    }
    this.pickMonth(this._selectedMonth);
  },

  pickMonth(month) {
    const m = START_MONTHS.find(s => s.month === month);
    Player.startMonth = month;
    Player.month = month;
    Player.day = 1;
    Player.hour = 23;             // 第一天从前夜23点开始
    Player.sleepStart = 23;
    this.applyEffects(m.delta, false);
    Player.achievements.add(m.achievement);
    toast(`🏅 ${m.achievement}`, "achievement", 2200);
    this._selectedMonth = null;

    setTimeout(() => {
      showScreen("screen-game");
      this.renderStatus();
      // 第一天直接展示起床选择
      this.showWakeChoice(true);
    }, 1500);
  },

  // ========== 通用确认栏 ==========
  addConfirmBar(gridId, btnText, onclickStr) {
    const grid = $(gridId);
    if (!grid) return;
    // 移除旧的确认栏
    const next = grid.nextElementSibling;
    if (next && next.classList.contains("lifetag-footer")) next.remove();
    const bar = document.createElement("div");
    bar.className = "lifetag-footer";
    bar.innerHTML = `<span></span><button class="btn-main btn-tag-confirm" onclick="${onclickStr}">${btnText}</button>`;
    grid.parentNode.insertBefore(bar, grid.nextSibling);
  },

  // ========== 起床选择（模态版）==========
  showWakeChoice(firstDay = false) {
    Player.pendingWake = true;
    $("actionsSection").style.display = "none";
    $("eventBox").style.display = "none";
    $("wakeBox").style.display = "none";

    // 计算昨夜睡眠
    let lastNightSleep = Player.sleepHours;
    let sleepWarn = "";
    if (lastNightSleep < 6) {
      sleepWarn = `<div class="sleep-warn">⚠️ 昨晚只睡了 ${lastNightSleep.toFixed(1)} 小时，精神-${Math.round((6 - lastNightSleep) * 3)}</div>`;
    } else if (lastNightSleep > 9) {
      sleepWarn = `<div class="sleep-warn ok">😴 昨晚睡了 ${lastNightSleep.toFixed(1)} 小时（睡多了反而困）</div>`;
    } else {
      sleepWarn = `<div class="sleep-warn ok">✓ 昨晚睡了 ${lastNightSleep.toFixed(1)} 小时</div>`;
    }
    if (Player.consecutiveEarly >= 3) {
      sleepWarn += `<div class="sleep-warn streak">🔥 已连续早起 ${Player.consecutiveEarly} 天，精神状态稳定</div>`;
    }

    const opts = WAKE_OPTIONS.map(o => {
      let extra = "";
      if (o.id === "early") {
        if (lastNightSleep < 6) {
          extra = `<span class="wake-warn">睡眠不足强行早起 → 精神 -5</span>`;
        } else if (Player.consecutiveEarly >= 2) {
          extra = `<span class="wake-bonus">连续早起加成 → 精神 +${3 + Player.consecutiveEarly}</span>`;
        }
      }
      return `
        <div class="wake-card" onclick="Game.pickWake('${o.id}')">
          <div class="wake-time">${o.label}</div>
          <div class="wake-desc">${o.desc}</div>
          <div class="wake-hint">${o.hint}</div>
          ${extra}
        </div>
      `;
    }).join("");

    const html = `
      <div class="wake-box">
        <div class="wake-title">🌅 ${Player.month}月${Player.day}日 · 起床时间</div>
        ${sleepWarn}
        <div class="wake-options">${opts}</div>
      </div>
    `;
    UI.showModal(html, false);
  },

  pickWake(id) {
    const opt = WAKE_OPTIONS.find(o => o.id === id);
    if (!opt) return;
    Player.hour = opt.time;
    Player.pendingWake = false;
    let logMsg = `🌅 <b>${opt.label.replace("🌅 ","").replace("☀️ ","").replace("🛌 ","")}</b>`;

    // 计算精神影响
    const lastSleep = Player.sleepHours;
    let sanityDelta = 0, moodDelta = 0;

    if (id === "early") {
      if (lastSleep < 6) {
        sanityDelta -= 5;
        Player.consecutiveEarly = 0;
        logMsg += " — <i>但你只睡了" + lastSleep.toFixed(1) + "小时，强行早起精神-5</i>";
      } else {
        Player.consecutiveEarly++;
        sanityDelta += 2 + Math.min(5, Player.consecutiveEarly);
        if (Player.consecutiveEarly >= 3) {
          logMsg += ` — <i>已连续早起${Player.consecutiveEarly}天，精神+${sanityDelta}</i>`;
          if (Player.consecutiveEarly === 3) {
            Player.achievements.add("晨型卷王");
            toast("🏅 晨型卷王", "achievement");
          }
        }
      }
    } else if (id === "normal") {
      Player.consecutiveEarly = 0;
      if (lastSleep < 6) {
        sanityDelta -= Math.round((6 - lastSleep) * 3);
        moodDelta -= 2;
      }
    } else if (id === "lazy") {
      Player.consecutiveEarly = 0;
      moodDelta += 3;
      sanityDelta -= 1;
    }

    if (sanityDelta || moodDelta) {
      this.applyEffects({ sanity: sanityDelta, mood: moodDelta });
    }
    this.addLog(logMsg);

    UI.hideModal();

    // 起床后允许"再赖床15分钟"（仅当选lazy或normal时给出选项）
    if ((id === "lazy" || id === "normal") && Math.random() < 0.6) {
      this.showLazyMore();
    } else {
      this.startDayActions();
    }
  },

  // 起床后追加"再睡15分钟"机制（模态版）
  showLazyMore() {
    const html = `
      <div class="wake-box">
        <div class="wake-title">⏰ 闹钟再次响起</div>
        <div class="lazy-prompt">
          你伸手按掉了闹钟。<br>
          <em>再睡15分钟？</em>
        </div>
        <div class="wake-options">
          <div class="wake-card" onclick="Game.lazyMore(true)">
            <div class="wake-time">🛏️ 再赖15分钟</div>
            <div class="wake-desc">"就15分钟，真的"</div>
            <div class="wake-hint">精神+1，但连续2次会昏睡到11:00</div>
          </div>
          <div class="wake-card" onclick="Game.lazyMore(false)">
            <div class="wake-time">💪 立刻起床</div>
            <div class="wake-desc">真男人/女人不赖床</div>
            <div class="wake-hint">心态+2，重置连续赖床计数</div>
          </div>
        </div>
      </div>
    `;
    UI.showModal(html, false);
  },

  lazyMore(yes) {
    if (yes) {
      Player.consecutiveLazy++;
      if (Player.consecutiveLazy >= 2) {
        Player.hour = 11;
        Player.consecutiveLazy = 0;
        this.applyEffects({ sanity: 12, mood: 5, study: -5 });
        this.addLog("😪 <b>又赖了一次</b> — 直接昏睡到 <em>11:00</em>，精神+12，但今日学习时间少了一截。");
        Player.achievements.add("摆烂艺术家");
        toast("🏅 摆烂艺术家", "achievement");
      } else {
        Player.hour += 0.25;
        this.applyEffects({ sanity: 1 });
        this.addLog(`🛏️ 又赖了 15 分钟 — 精神+1。现在 ${fmtHour(Player.hour)}。`);
      }
    } else {
      Player.consecutiveLazy = 0;
      this.applyEffects({ mood: 2 });
      this.addLog("💪 一鼓作气起床 — 心态+2");
    }
    UI.hideModal();
    this.startDayActions();
  },

  startDayActions() {
    UI.hideModal();
    $("wakeBox").style.display = "none";
    $("actionsSection").style.display = "block";
    this.renderStatus();
    this.renderActions();
  },

  applyEffects(effects, logIt = true) {
    const changes = [];
    for (const [key, delta] of Object.entries(effects || {})) {
      if (!(key in Player.stats)) continue;
      const before = Player.stats[key];
      Player.stats[key] = clamp(before + delta);
      const diff = Player.stats[key] - before;
      if (diff !== 0) {
        const icon = { study: "📚", mood: "❤️", money: "💰", relation: "🤝", sanity: "🧠" }[key];
        const label = { study: "复习", mood: "心态", money: "钱包", relation: "关系", sanity: "精神" }[key];
        const sign = diff > 0 ? "+" : "";
        changes.push(`${icon}${label} ${sign}${diff}`);
      }
    }
    if (logIt && changes.length) this.addLog(changes.join(" · "));
    return changes;
  },

  addLog(msg) {
    const log = $("logBox");
    if (!log) return;
    const div = document.createElement("div");
    div.className = "log-item";
    div.innerHTML = msg.replace(/\+(\d+)/g, '<span class="log-delta-plus">+$1</span>')
                       .replace(/-(\d+)/g, '<span class="log-delta-minus">-$1</span>');
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 12) log.removeChild(log.firstChild);
  },

  // ========== 状态栏 ==========
  renderStatus() {
    const dateBox = $("dateBox");
    if (dateBox) {
      dateBox.innerHTML = `
        <div class="date-top">
          <span class="date-month">${Player.month}月</span>
          <span class="date-day">${Player.day}日</span>
        </div>
        <div class="date-clock">⏰ ${fmtHour(Player.hour)}</div>
        <div class="date-sub">第 ${Player.daysPlayed + 1} 天 / 360</div>
      `;
    }
    const apBox = $("apBox");
    if (apBox) {
      const dots = [];
      for (let i = 0; i < Player.apMax; i++) {
        dots.push(`<div class="ap-dot ${i < Player.ap ? "" : "spent"}">⚡</div>`);
      }
      apBox.innerHTML = `
        <div class="ap-label">今日体力</div>
        <div class="ap-dots">${dots.join("")}</div>
      `;
    }

    const keys = [
      { k: "study", icon: "📚", label: "复习" },
      { k: "mood", icon: "❤️", label: "心态" },
      { k: "money", icon: "💰", label: "钱包" },
      { k: "relation", icon: "🤝", label: "关系" },
      { k: "sanity", icon: "🧠", label: "精神" },
    ];
    // P0: 添加 data-key 属性支持局部更新
    $("statsGrid").innerHTML = keys.map(({ k, icon, label }) => {
      const val = Player.stats[k];
      const cls = val <= 25 ? "low" : (val >= 75 ? "high" : "");
      return `
        <div class="stat-cell ${cls}" data-key="${k}">
          <div class="stat-label">${icon} ${label}</div>
          <div class="stat-value">${val}</div>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${val}%"></div></div>
        </div>
      `;
    }).join("");

    this.renderPathPartners();
  },

  renderPathPartners() {
    const box = $("pathPartnerBar");
    if (!box) return;
    const tagInfo = Player.lifeTags.length
      ? Player.lifeTags.map(id => {
          const t = LIFE_TAGS.find(x => x.id === id);
          return t ? `<span class="badge badge-tag">${t.emoji}${t.name}</span>` : "";
        }).join("")
      : "";
    const pathInfo = Player.path
      ? `<span class="badge badge-path">${LEARNING_PATHS[Player.path.toUpperCase()]?.name || Player.path}</span>`
      : "";
    const partnerInfo = Player.partners.length
      ? Player.partners.map(p => `<span class="badge badge-partner">${PARTNERS[p].emoji}${PARTNERS[p].name}</span>`).join("")
      : "";
    box.innerHTML = tagInfo + pathInfo + partnerInfo
      || `<span class="badge badge-empty">空荡荡</span>`;
  },

  // ========== 渲染行动 ==========
  renderActions() {
    const grid = $("actionsGrid");
    if (!grid) return;

    grid.innerHTML = ACTIONS.map(a => {
      const apOk = Player.ap >= a.cost;
      const dur = Array.isArray(a.duration) ? `${a.duration[0]}-${a.duration[1]}h` : `${a.duration}h`;
      const endHour = Player.hour + (Array.isArray(a.duration) ? a.duration[1] : a.duration);
      const timeOk = endHour <= 23.5;
      const disabled = !apOk || !timeOk;
      const reason = !apOk ? "体力不足" : (!timeOk ? "时间不够" : "");
      const costDots = "⚡".repeat(a.cost);
      const fx = Object.entries(a.effects).map(([k, v]) => {
        const icon = { study: "📚", mood: "❤️", money: "💰", relation: "🤝", sanity: "🧠" }[k];
        return `${icon}${v > 0 ? "+" : ""}${v}`;
      }).join(" ");
      return `
        <div class="action-card ${disabled ? "disabled" : ""}" data-action="${a.id}"
             onclick="${disabled ? `Game.hintBlock('${reason}')` : `Game.doAction('${a.id}')`}">
          <div class="action-top">
            <span class="action-icon">${a.icon}</span>
            <span class="action-cost">${costDots}</span>
          </div>
          <div class="action-name">${a.name}</div>
          <div class="action-desc">${a.desc}</div>
          <div class="action-time">⏱ ${dur}</div>
          <div class="action-fx">${fx}</div>
        </div>
      `;
    }).join("");

    const endBtn = $("endDayBtn");
    if (endBtn) {
      endBtn.style.display = "block";
      if (Player.hour >= 22) {
        endBtn.textContent = "🌙 该睡了 · 设置闹钟";
      } else if (Player.ap === 0) {
        endBtn.textContent = "💤 体力耗尽 · 提前结束今日";
      } else {
        endBtn.textContent = `🌙 结束今日 · 当前 ${fmtHour(Player.hour)}`;
      }
    }
  },

  hintBlock(reason) {
    toast(reason, "normal", 1200);
  },

  // ========== 执行行动 ==========
  doAction(actionId) {
    const act = ACTIONS.find(a => a.id === actionId);
    if (!act) return;
    if (Player.ap < act.cost) return;

    // P0: 执行脉冲视觉反馈
    UI.pulseCard(actionId);

    // 实际时长（可能为随机区间）
    let duration = act.duration;
    if (Array.isArray(duration)) {
      duration = randRange(duration[0], duration[1]);
      duration = Math.round(duration * 10) / 10;
    }

    Player.ap -= act.cost;
    Player.hour += duration;

    // 数值
    const changes = this.applyEffects(act.effects);

    const flavor = randPick(act.flavor);
    this.addLog(`${act.icon} <b>${act.name}</b>（${duration}h） — ${flavor}`);
    Player.actionLog.push(act.id);

    if (this.checkBreakdown()) {
      SaveSystem.autoSave("崩溃结局");
      return;
    }

    // P0: UI局部更新（只更新数值，不重建DOM）
    UI.renderStatsDiff(changes);
    this.renderPathPartners();
    this.renderActions();

    // P0: 每日必触发事件（替代旧25%概率）
    // 每进行2-3个行动后，高概率触发事件
    if (Player.actionLog.length >= 2 && Math.random() < 0.8) {
      if (this.triggerRandomEvent()) return;
    }

    // 自动判定：超过22:30，强制询问是否睡觉
    if (Player.hour >= 22.5) {
      setTimeout(() => this.endDay(), 600);
      return;
    }
  },

  // ========== 结束今日（睡觉）==========
  endDay() {
    this.showSleepDialog();
  },

  showSleepDialog() {
    $("actionsSection").style.display = "none";
    $("wakeBox").style.display = "none";

    const now = Player.hour;
    let nightTone = "";
    if (now < 22) nightTone = "今天早睡，明天会回血。";
    else if (now < 24) nightTone = "正常作息。";
    else if (now < 26) nightTone = "已经凌晨了，硬撑要付出代价。";
    else nightTone = "通宵选手警告。";

    const html = `
      <div class="wake-box">
        <div class="wake-title">🌙 设置闹钟</div>
        <div class="sleep-info">现在是 <em>${fmtHour(now > 24 ? now - 24 : now)}</em>${now > 24 ? "（次日）" : ""}<br>${nightTone}</div>
        <div class="wake-options">
          ${[6, 7, 8, 9, 10].map(h => {
            const sleep = (24 + h) - now;
            const sleepFinal = sleep > 24 ? sleep - 24 : sleep;
            const tag = sleepFinal < 6 ? "<span class='wake-warn'>睡不够</span>" :
                        sleepFinal > 9 ? "<span class='wake-bonus'>充足</span>" :
                        "<span class='wake-bonus'>正常</span>";
            return `
              <div class="wake-card" onclick="Game.confirmSleep(${h})">
                <div class="wake-time">⏰ ${h}:00 起</div>
                <div class="wake-desc">睡 ${sleepFinal.toFixed(1)} 小时</div>
                <div class="wake-hint">${tag}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
    UI.showModal(html, false);
  },

  confirmSleep(wakeHour) {
    // 计算睡眠时长
    const now = Player.hour;
    const sleepHours = (24 + wakeHour) - now;
    const finalSleep = sleepHours > 24 ? sleepHours - 24 : sleepHours;

    Player.sleepStart = now;
    Player.sleepHours = finalSleep;
    Player.nightAlarm = wakeHour;

    this.addLog(`🌙 <b>${fmtHour(now > 24 ? now - 24 : now)} 入睡</b>，闹钟设在 ${wakeHour}:00（计划睡 ${finalSleep.toFixed(1)} 小时）`);

    UI.hideModal();
    SaveSystem.autoSave("每日结束");

    // 进入下一天
    this.dailySummary();
    setTimeout(() => this.nextDay(), 800);
  },

  dailySummary() {
    const studiedToday = Player.actionLog.some(id =>
      ["shuati", "beishen", "wangke", "moukao"].includes(id)
    );
    if (!studiedToday) {
      this.applyEffects({ study: -2, sanity: -1 });
      this.addLog("😶 <i>今天啥也没学。</i>");
    }
    Player.actionLog = [];
  },

  nextDay() {
    if (this.checkBreakdown()) return;

    Player.daysPlayed++;
    Player.day++;
    Player.ap = Player.apMax;

    if (Player.day > 30) {
      Player.day = 1;
      Player.month++;
      if (Player.month > 12) Player.month = 1;
      this.monthlyUpkeep();
    }

    const mile = MILESTONES.find(m => m.month === Player.month && m.day === Player.day);
    if (mile) {
      SaveSystem.autoSave("里程碑: " + mile.name);
      this.triggerMilestone(mile);
      return;
    }

    if (Player.daysPlayed >= Player.totalDays) {
      this.endGame();
      return;
    }

    // 触发当天起床选择
    this.renderStatus();
    this.showWakeChoice();
  },

  monthlyUpkeep() {
    const delta = { money: -8 };
    if (Player.path === "zhengtong") {
      delta.study = (delta.study || 0) + 3;
      delta.mood = (delta.mood || 0) - 2;
    } else if (Player.path === "xiexiu") {
      const chaos = Math.random();
      delta.study = (delta.study || 0) + (chaos > 0.5 ? 8 : -5);
      delta.mood = (delta.mood || 0) + 5;
    } else if (Player.path === "bailan") {
      delta.mood = (delta.mood || 0) + 10;
      delta.sanity = (delta.sanity || 0) + 5;
      delta.study = (delta.study || 0) - 4;
    }
    Player.partners.forEach(pid => {
      const p = PARTNERS[pid];
      if (!p) return;
      Object.entries(p.monthly).forEach(([k, v]) => {
        delta[k] = (delta[k] || 0) + v;
      });
    });
    this.applyEffects(delta);
    this.addLog(`📅 <b>${Player.month}月总结</b> · 房租水电 + 路线/搭子加成`);
  },

  triggerMilestone(mile) {
    this.renderStatus();
    toast(`📌 ${mile.name}`, "achievement", 2200);
    if (mile.type === "bishi_sheng" || mile.type === "bishi_guo") {
      this.handleExam(mile);
      return;
    }
    if (mile.type === "chufen_sheng") {
      this.handleResult();
      return;
    }
    this.addLog(`📌 <b>${mile.name}</b> — ${mile.desc}`);
    setTimeout(() => {
      this.renderStatus();
      this.showWakeChoice();
    }, 800);
  },

  handleExam(mile) {
    const study = Player.stats.study;
    const sanity = Player.stats.sanity;
    const score = Math.min(95, study * 0.8 + sanity * 0.15 + (Math.random() * 15 - 5));
    const scoreRound = Math.round(score * 10) / 10;
    Player._examScore = scoreRound;

    $("eventBox").style.display = "block";
    $("actionsSection").style.display = "none";
    $("wakeBox").style.display = "none";

    $("eventTitle").textContent = `· ${mile.name} ·`;
    $("eventDesc").innerHTML = `你走进考场。${mile.desc}

<em>行测：政治理论 / 言语 / 判断 / 资料 / 常识</em>

3小时后——

你查了粉笔对答案的分数：<em>${scoreRound}</em> 分。`;

    $("eventChoices").innerHTML = `
      <button class="choice-btn" onclick="Game.resumeFromExam()">
        <span class="choice-label">✓</span>
        <span>继续备考生活</span>
      </button>
    `;
  },

  resumeFromExam() {
    $("eventBox").style.display = "none";
    this.showWakeChoice();
  },

  handleResult() {
    const score = Player._examScore || 50;
    $("eventBox").style.display = "block";
    $("actionsSection").style.display = "none";
    $("wakeBox").style.display = "none";
    $("eventTitle").textContent = "· 省考出分 ·";

    let msg, delta;
    if (score >= 70) {
      msg = `<em>笔试：${score} 分</em>\n\n你进面了，第一名。\n这是你第一次真实感受到：<em>可能真的能上岸。</em>`;
      delta = { mood: 25, sanity: 15 };
      Player.achievements.add("进面一号位");
    } else if (score >= 60) {
      msg = `<em>笔试：${score} 分</em>\n\n你进面了，第3名（3进1）。\n你的手在抖。`;
      delta = { mood: 15, sanity: -3 };
      Player.achievements.add("笔面比玄学家");
    } else if (score >= 50) {
      msg = `<em>笔试：${score} 分</em>\n\n差 ${(60 - score).toFixed(1)} 分进面。\n你在便利店门口站了10分钟。`;
      delta = { mood: -15, sanity: -10 };
    } else {
      msg = `<em>笔试：${score} 分</em>\n\n没进面。\n你甚至没脸告诉你妈。`;
      delta = { mood: -20, sanity: -15 };
    }
    this.applyEffects(delta);
    $("eventDesc").innerHTML = msg;
    $("eventChoices").innerHTML = `
      <button class="choice-btn" onclick="Game.resumeFromExam()">
        <span class="choice-label">✓</span>
        <span>接受现实，继续前行</span>
      </button>
    `;
  },

  // ========== 随机事件（v0.5新引擎：必定触发+稀有度权重）==========
  makeContext() {
    return {
      ...Player.stats,
      month: Player.month, day: Player.day, hour: Player.hour,
      daysPlayed: Player.daysPlayed,
      monthsPlayed: Math.floor(Player.daysPlayed / 30),
      identity: Player.identity, path: Player.path,
      partners: Player.partners, lifeTags: Player.lifeTags,
    };
  },

  // 每日必定触发随机事件
  triggerRandomEvent() {
    const ctx = this.makeContext();
    // 筛选符合条件且未被使用过的事件
    const candidates = EVENTS.filter(e => {
      if (e.id === "ai_placeholder") return false;
      if (Player.usedEvents.has(e.id)) return false;
      if (e.cond && !e.cond(ctx)) return false;
      return true;
    });
    if (candidates.length === 0) return false;

    // 按稀有度权重计算
    const weighted = [];
    candidates.forEach(e => {
      const weight = e.rarityWeight || (e.weight || 1);
      for (let i = 0; i < Math.ceil(weight * 10); i++) {
        weighted.push(e);
      }
    });
    if (weighted.length === 0) return false;

    const event = randPick(weighted);
    Player.usedEvents.add(event.id);
    this.showEvent(event);
    return true;
  },

  showEvent(event) {
    $("actionsSection").style.display = "none";
    $("eventBox").style.display = "block";
    $("wakeBox").style.display = "none";

    const rarityLabel = event.rarity === "legendary" ? "🟡传说" :
                        event.rarity === "epic" ? "🟣史诗" :
                        event.rarity === "rare" ? "🔵稀有" : "";

    $("eventTitle").innerHTML = `${rarityLabel ? rarityLabel + " · " : ""}${event.title}`;
    $("eventDesc").innerHTML = event.desc;
    $("eventChoices").innerHTML = event.choices.map((ch, i) => {
      const label = ch.label || String.fromCharCode(65 + i);
      return `
        <button class="choice-btn" onclick="Game.resolveEvent('${event.id}', ${i})">
          <span class="choice-label">${label}</span>
          <span>${ch.text}</span>
        </button>
      `;
    }).join("");
    SaveSystem.autoSave("事件: " + event.title);
  },

  resolveEvent(eventId, choiceIdx) {
    const event = EVENTS.find(e => e.id === eventId);
    if (!event) return;
    const choice = event.choices[choiceIdx];
    if (!choice) return;

    // 应用效果
    if (choice.effects) {
      this.applyEffects(choice.effects);
    }

    // 设置路线
    if (choice.setPath) {
      Player.path = choice.setPath;
    }

    // 添加搭子
    if (choice.addPartner) {
      if (!Player.partners.includes(choice.addPartner) && Player.partners.length < 2) {
        Player.partners.push(choice.addPartner);
      }
    }

    // 解锁成就
    if (choice.achievement) {
      Player.achievements.add(choice.achievement);
      toast(`🏅 ${choice.achievement}`, "achievement");
    }

    // 事件链标记
    if (choice.tagEvent) {
      Player._eventTags = Player._eventTags || [];
      Player._eventTags.push(choice.tagEvent);
    }

    $("eventBox").style.display = "none";
    SaveSystem.autoSave("事件解决: " + event.title);
    this.startDayActions();
  },

  // ========== 崩溃 ==========
  checkBreakdown() {
    if (Player.stats.sanity <= 2 || Player.stats.mood <= 2) {
      this.endGame("early_bengkui");
      return true;
    }
    return false;
  },

  // ========== 结局 ==========
  endGame(forceId) {
    let ending;
    if (forceId === "early_bengkui") ending = ENDINGS.find(e => e.id === "bengkui");
    else ending = this.pickEnding();
    if (!ending) ending = DEFAULT_ENDING;

    (ending.autoAchievements || []).forEach(a => Player.achievements.add(a));

    // 记录结局到meta
    const meta = SaveSystem.loadMeta();
    meta.bestEndings = meta.bestEndings || [];
    if (!meta.bestEndings.find(e => e.id === ending.id)) {
      meta.bestEndings.push({ id: ending.id, title: ending.title, date: new Date().toISOString() });
      meta.bestEndings = meta.bestEndings.slice(-10);
    }
    SaveSystem.saveMeta(meta);
    SaveSystem.deleteSave();

    if (ending.id === "shangan_fengdian") {
      this.playFanjinCutscene(() => this.renderEnding(ending));
    } else {
      this.renderEnding(ending);
    }
  },

  pickEnding() {
    const s = Player.stats;
    for (const ending of ENDINGS) {
      if (ending.cond && ending.cond(s)) return ending;
    }
    return DEFAULT_ENDING;
  },

  playFanjinCutscene(cb) {
    const overlay = $("fanjin-overlay");
    const text = $("fanjinText");
    overlay.classList.add("active");
    const lines = ["噫！", "好了！", "我中了！"];
    let i = 0;
    const show = () => {
      if (i >= lines.length) { overlay.classList.remove("active"); cb && cb(); return; }
      text.textContent = lines[i]; i++;
      setTimeout(show, 1100);
    };
    show();
  },

  renderEnding(ending) {
    $("endingEmoji").textContent = ending.emoji;
    const titleEl = $("endingTitle");
    titleEl.textContent = ending.title;
    titleEl.className = `ending-title ${ending.type}`;
    $("endingSub").textContent = ending.sub;
    $("endingNarrative").innerHTML = ending.narrative;

    const keys = [
      { k: "study", icon: "📚", label: "复习" },
      { k: "mood", icon: "❤️", label: "心态" },
      { k: "money", icon: "💰", label: "钱包" },
      { k: "relation", icon: "🤝", label: "关系" },
      { k: "sanity", icon: "🧠", label: "精神" },
    ];
    $("endingStats").innerHTML = keys.map(({ k, icon, label }) => `
      <div class="stat-cell">
        <div class="stat-label">${icon} ${label}</div>
        <div class="stat-value">${Player.stats[k]}</div>
      </div>
    `).join("");

    const achList = $("achievementsList");
    const achs = Array.from(Player.achievements);
    if (!achs.length) achList.innerHTML = '<div class="empty-ach">（未解锁成就）</div>';
    else {
      achList.innerHTML = achs.map(a => {
        const meta = ACHIEVEMENTS[a];
        return `
          <div class="achievement-item">
            <div class="ach-name">🏅 ${a}</div>
            ${meta ? `<div class="ach-desc">${meta.desc}</div>` : ""}
          </div>
        `;
      }).join("");
    }
    showScreen("screen-ending");
  },

  reset() {
    Player.identity = null;
    Player.year = 2026;
    Player.month = 3;
    Player.day = 1;
    Player.hour = 8;
    Player.daysPlayed = 0;
    Player.ap = 4;
    Player.apMax = 4;
    Player.sleepStart = 23;
    Player.sleepHours = 8;
    Player.consecutiveEarly = 0;
    Player.consecutiveLazy = 0;
    Player.stats = { study: 50, mood: 50, money: 50, relation: 50, sanity: 50 };
    Player.lifeTags = [];
    Player.path = null;
    Player.partners = [];
    Player.achievements = new Set();
    Player.usedEvents = new Set();
    Player.aiEventUsed = false;
    Player._aiEvent = null;
    Player._examScore = null;
    Player.actionLog = [];
    Player.pendingWake = true;
    const log = $("logBox");
    if (log) log.innerHTML = "";
    showScreen("screen-start");
  },
};

// ========== AI 生成事件 ==========
const AI = {
  endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
  model: "hunyuan-turbos-latest",
  getKey() { return localStorage.getItem("hunyuan_api_key") || ""; },
  setKey(k) { localStorage.setItem("hunyuan_api_key", k || ""); },
  async generateEvent(ctx) {
    const key = this.getKey();
    if (!key) return null;
    return null; // v0.4 暂不在主循环里调用
  },
};

const Share = {
  screenshot() {
    const achs = Array.from(Player.achievements).map(a => `🏅 ${a}`).join("\n");
    const title = $("endingTitle").textContent;
    const sub = $("endingSub").textContent;
    const tagInfo = Player.lifeTags.length
      ? "标签：" + Player.lifeTags.map(id => LIFE_TAGS.find(x => x.id === id)?.name).join("、") : "";
    const text = `《上岸模拟器 v0.5》
结局：【${title}】 ${sub}

${tagInfo}
数值：📚${Player.stats.study} ❤️${Player.stats.mood} 💰${Player.stats.money} 🤝${Player.stats.relation} 🧠${Player.stats.sanity}

${achs ? "成就：\n" + achs : ""}

#上岸模拟器 #考公人`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast("✓ 已复制分享文案"))
                         .catch(() => toast("请手动长按复制"));
    } else toast("浏览器不支持复制");
  }
};

const Settings = {
  open() {
    const panel = $("settingsPanel");
    if (panel) {
      panel.classList.add("active");
      $("apiKeyInput").value = AI.getKey();
    }
  },
  close() {
    const panel = $("settingsPanel");
    if (panel) panel.classList.remove("active");
  },
  save() {
    const k = $("apiKeyInput").value.trim();
    AI.setKey(k);
    toast(k ? "✓ 已保存" : "✓ 已清除", "normal", 1500);
    this.close();
  },
};

window.addEventListener("DOMContentLoaded", () => Game.init());
