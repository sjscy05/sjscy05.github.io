// ===== 院长模拟器 · 完整游戏引擎 =====
import {
    INITIAL_RELATION, BACKGROUND_POOL, STAFF_TEMPLATES, STAFF_PERSONA_POOL,
    DEPT_CONFIG, CURRICULUM_PASSIVE, OFFICE_DECOR, TITLE_RULES, ACHIEVEMENTS,
    DIFFICULTY_PRESETS, STUDENT_ARCHETYPES
} from './config.js';
import {
    STUDENT_COMMENTS, TEACHER_COMMENTS, LEADERSHIP_COMMENTS,
    GENERIC_RANDOM_EVENTS, REAL_UNIVERSITY_EVENTS, PET_EVENTS,
    STUDENT_INTERACT_EVENTS, buildTermEndNarrative, createEventData
} from './events.js';

// ========== 辅助函数 ==========
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function v2Pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ========== 状态初始化 ==========
let v2 = {};
function v2DefaultState() {
    return {
        playerName: '',
        deptType: 'cs',
        curriculum: 'balanced',
        difficulty: 'normal',

        funds: 30,
        academicRep: 30,
        adminRep: 30,
        morale: 30,
        studentEval: 30,

        semester: 1,
        month: 1,
        totalMonth: 0,

        usedDays: 0,
        availableDays: 28 + 2,
        carryoverDays: 0,
        energy: 100,

        staff: [],
        relations: {},
        flags: {
            reforms: 0,
            termPersonalStoryUsed: false,
            adoptedPets: [],
            metStudents: []
        },

        actionQueue: [],
        pendingExecutionQueue: null,
        executionMode: false,
        executionPhase: '',
        executionTimeline: null,
        executionStep: 0,
        executionIndex: 0,
        executionLogs: [],
        executionRandomEvents: null,
        executionRandomEventIdx: 0,
        executionPendingPersonal: false,
        executionQueue: null,

        messages: [],
        titles: [],
        achievements: [],
        admissionStreak: 0,
        prevEval: 30,

        currentEvent: null,
        currentEventResolved: false,
        termEndShown: false,
        gameOver: false,

        // 成就系统
        metaPoints: 0,
    };
}

// ========== 存档系统 (localStorage) ==========
function v2MetaLoad() {
    try {
        const raw = localStorage.getItem('dean_meta');
        return raw ? JSON.parse(raw) : { points: 0, ach: [], unlocks: [], totalRuns: 0, bestScore: 0 };
    } catch { return { points: 0, ach: [], unlocks: [], totalRuns: 0, bestScore: 0 }; }
}
function v2MetaSave(meta) {
    try { localStorage.setItem('dean_meta', JSON.stringify(meta)); } catch {}
}
function v2SaveGame(slot) { // slot: 'auto' or 1-3
    try {
        v2._saveVersion = 1; v2._saveTime = Date.now();
        localStorage.setItem('dean_save_' + slot, JSON.stringify(v2));
    } catch {}
}
function v2LoadGame(slot) {
    try {
        const raw = localStorage.getItem('dean_save_' + slot);
        if (raw) { v2 = JSON.parse(raw); v2RenderPlaying(); return true; }
    } catch {}
    return false;
}
function v2HasSave(slot) {
    try { return !!localStorage.getItem('dean_save_' + slot); } catch { return false; }
}

// ========== 数值更新 ==========
function v2UpdateStats() {
    v2.funds = clamp(v2.funds, -20, 100);
    v2.academicRep = clamp(v2.academicRep, 0, 100);
    v2.adminRep = clamp(v2.adminRep, 0, 100);
    v2.morale = clamp(v2.morale, 0, 100);
    v2.studentEval = clamp(v2.studentEval, 0, 100);
}

function v2ApplyEffect(effect) {
    if (!effect) return;
    if (effect.funds !== undefined) v2.funds += effect.funds;
    if (effect.academicRep !== undefined) v2.academicRep += effect.academicRep;
    if (effect.adminRep !== undefined) v2.adminRep += effect.adminRep;
    if (effect.morale !== undefined) v2.morale += effect.morale;
    if (effect.studentEval !== undefined) v2.studentEval += effect.studentEval;
    if (effect.reputation !== undefined) v2.academicRep += effect.reputation;
}

function v2CalcAvailableDays() {
    const base = 28 + 2; // 基础 + 咖啡机
    let extra = 0;
    if (v2.officeDecors && v2.officeDecors.includes('coffee')) extra += 2;
    return base + extra;
}

// ========== 成就与称号 ==========
function v2CheckAchievements() {
    const meta = v2MetaLoad();
    meta.ach = meta.ach || [];

    // iron triangle: 下属忠诚同时>80
    if (v2.staff && v2.staff.every(s => s.loyalty >= 80) && !meta.ach.includes('all_loyal')) {
        const a = ACHIEVEMENTS.find(x => x.id === 'all_loyal');
        if (a) { meta.ach.push('all_loyal'); meta.points += a.points; v2PushMail(`成就解锁：${a.name}（+${a.points}周目点）`); }
    }
    // admission streak 3连涨
    if (v2.admissionStreak >= 3 && !meta.ach.includes('admission_streak')) {
        const a = ACHIEVEMENTS.find(x => x.id === 'admission_streak');
        if (a) { meta.ach.push('admission_streak'); meta.points += a.points; v2PushMail(`成就解锁：${a.name}（+${a.points}周目点）`); }
    }
    v2MetaSave(meta);
}

function v2UnlockTitles() {
    TITLE_RULES.forEach(r => {
        if (r.cond(v2) && !v2.titles.find(t => t.id === r.id)) {
            v2.titles.push({ id: r.id, name: r.name });
        }
    });
}

// ========== 消息系统 ==========
function v2PushMail(text, type = 'info') {
    v2.messages.push({ text, type, time: Date.now() });
    if (v2.messages.length > 50) v2.messages.splice(0, v2.messages.length - 50);
}

function v2QueueAchievementToast(name, points) {
    const host = document.getElementById('v2ToastHost');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'v2-ach-toast';
    el.textContent = `🏆 ${name} (+${points})`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

// ========== 下属能力计算 ==========
function useStaffAbility(staffId, statName, maxBonus) {
    const staff = v2.staff.find(s => s.id === staffId);
    if (!staff) return 0;
    const ratio = (staff.loyalty + staff.ability) / 200;
    const bonus = Math.round(maxBonus * ratio);
    return bonus;
}

// ========== 关系系统 ==========
function adjustRelation(key, delta) {
    if (!v2.relations[key]) return;
    v2.relations[key].favor = clamp(v2.relations[key].favor + delta, 0, 100);
}

// ========== 初始化下属 ==========
function v2InitStaff() {
    const staff = [];
    STAFF_TEMPLATES.forEach(t => {
        const pool = STAFF_PERSONA_POOL[t.id];
        if (!pool || pool.length === 0) return;
        const persona = v2Pick(pool);
        const ability = Math.floor(Math.random() * (persona.abilityRange[1] - persona.abilityRange[0] + 1)) + persona.abilityRange[0];
        const loyalty = Math.floor(Math.random() * (persona.loyaltyRange[1] - persona.loyaltyRange[0] + 1)) + persona.loyaltyRange[0];
        staff.push({
            id: t.id,
            title: t.title,
            name: persona.name,
            trait: persona.trait,
            profile: persona.profile,
            ability: clamp(ability, 0, 100),
            loyalty: clamp(loyalty, 0, 100),
            quest: persona.quest ? { ...persona.quest } : null,
            flaw: persona.flaw || '',
            questCompleted: false
        });
    });
    v2.staff = staff;
}

// ========== 开局向导 ==========
function v2RenderSetup() {
    const app = document.getElementById('app');
    v2 = v2DefaultState();

    let step = 0;
    const maxStep = 5;

    function renderStep() {
        app.classList.remove('page-transition-in');
        void app.offsetWidth;
        app.classList.add('page-transition-in');

        let html = `<div class="setup-wizard"><h2>📋 院长配置向导</h2>
            <div style="color:#8fa8b8;text-align:center;font-size:0.82em;margin-bottom:10px;">第 ${step+1} / ${maxStep} 步</div>`;

        if (step === 0) {
            const prologue = `你坐在校长办公室的皮椅上，对面的人递过来一份文件。

「学院交给你了。需要你做的，我都在这里写了。学生、教师、经费、评估——每一项都跑不掉。」

你翻开文件，第一页写着院系的名称。

这将是你的任期。有人会记住你的名字，有些人在等你犯错。`;
            html += `<div class="setup-prologue">${prologue}</div>
                <div class="wizard-nav"><button class="btn" id="wizardStart">开始配置 →</button></div>`;
        } else if (step === 1) {
            const depts = Object.entries(DEPT_CONFIG);
            html += `<label class="wiz-label">🏫 选择你的院系</label>
                <div class="setup-row">`;
            depts.forEach(([key, d]) => {
                const initStr = Object.entries(d.init).map(([k, v]) => `${{'academicRep':'学术','funds':'经费','adminRep':'行政','morale':'士气','studentEval':'学生'}[k]||k}${v>=0?'+':''}${v}`).join(', ');
                html += `<button class="btn compact dept-btn" data-dept="${key}">${d.icon} ${d.name}<br><span style="font-size:0.78em;color:#b0cec4;">${initStr}</span></button>`;
            });
            html += `</div>`;
        } else if (step === 2) {
            const curricula = [
                { key: 'theoretical', label: '📘 理论扎实', desc: '学术每学期 +2' },
                { key: 'applied', label: '🛠️ 应用技能', desc: '学生评价每学期 +2' },
                { key: 'balanced', label: '⚖️ 均衡培养', desc: '学术+1, 学生+1' },
                { key: 'research', label: '🔬 研究导向', desc: '学术+3, 经费-1' },
                { key: 'industry', label: '🏭 产教融合', desc: '经费+2, 学生+2, 行政+1' },
                { key: 'global', label: '🌍 国际化', desc: '学术+1, 学生+2, 行政+1' }
            ];
            html += `<label class="wiz-label">📚 选择培养定位</label>
                <div class="setup-row" style="grid-template-columns:repeat(3,1fr);">`;
            curricula.forEach(c => {
                html += `<button class="btn compact cur-btn" data-cur="${c.key}">${c.label}<br><span style="font-size:0.75em;color:#b0cec4;">${c.desc}</span></button>`;
            });
            html += `</div>`;
        } else if (step === 3) {
            const diffs = Object.entries(DIFFICULTY_PRESETS);
            html += `<label class="wiz-label">⚡ 难度选择</label>
                <div class="setup-row" style="grid-template-columns:repeat(3,1fr);">`;
            diffs.forEach(([key, d]) => {
                const initStr = Object.entries(d.init).map(([k, v]) => `${{'academicRep':'学术','funds':'经费','adminRep':'行政','morale':'士气','studentEval':'学生'}[k]||k}${v>=0?'+':''}${v}`).join(', ');
                html += `<button class="btn compact diff-btn" data-diff="${key}">${d.name}<br><span style="font-size:0.75em;color:#b0cec4;">${initStr || '无修正'}</span></button>`;
            });
            html += `</div>`;
        } else if (step === 4) {
            html += `<label class="wiz-label">✏️ 输入你的名字</label>
                <input class="wiz-input" id="nameInput" placeholder="例如：张院长" value="院长" maxlength="8">
                <div class="wizard-nav" style="margin-top:14px;">
                    <button class="btn" id="finishSetup">开始任期 →</button>
                </div>`;
        }

        if (step > 0 && step <= 3) {
            html += `<div class="wizard-nav"><button class="btn" id="wizardNext">下一步 →</button></div>`;
        }
        if (step > 0 && step <= 4) {
            html += `<button class="wizard-back-link" id="wizardBack">← 上一步</button>`;
        }

        html += `</div>`;
        app.innerHTML = html;

        // 事件绑定
        if (step === 0) {
            document.getElementById('wizardStart')?.addEventListener('click', () => { step = 1; renderStep(); });
        } else if (step === 1) {
            document.querySelectorAll('.dept-btn').forEach(b => {
                b.addEventListener('click', () => {
                    v2.deptType = b.dataset.dept;
                    document.querySelectorAll('.dept-btn').forEach(x => x.style.borderColor = '');
                    b.style.borderColor = '#f5cd79';
                });
            });
            document.getElementById('wizardNext')?.addEventListener('click', () => {
                if (!v2.deptType) return alert('请选择一个院系');
                step = 2; renderStep();
            });
        } else if (step === 2) {
            document.querySelectorAll('.cur-btn').forEach(b => {
                b.addEventListener('click', () => {
                    v2.curriculum = b.dataset.cur;
                    document.querySelectorAll('.cur-btn').forEach(x => x.style.borderColor = '');
                    b.style.borderColor = '#f5cd79';
                });
            });
            document.getElementById('wizardNext')?.addEventListener('click', () => {
                if (!v2.curriculum) return alert('请选择一个培养定位');
                step = 3; renderStep();
            });
        } else if (step === 3) {
            document.querySelectorAll('.diff-btn').forEach(b => {
                b.addEventListener('click', () => {
                    v2.difficulty = b.dataset.diff;
                    document.querySelectorAll('.diff-btn').forEach(x => x.style.borderColor = '');
                    b.style.borderColor = '#f5cd79';
                });
            });
            document.getElementById('wizardNext')?.addEventListener('click', () => {
                if (!v2.difficulty) return alert('请选择难度');
                step = 4; renderStep();
            });
        } else if (step === 4) {
            document.getElementById('finishSetup')?.addEventListener('click', () => {
                const name = document.getElementById('nameInput')?.value.trim() || '院长';
                v2.playerName = name;
                v2InitGame();
            });
        }

        if (document.getElementById('wizardBack')) {
            document.getElementById('wizardBack').addEventListener('click', () => { if (step > 0) { step--; renderStep(); } });
        }
    }

    renderStep();
}

// ========== 游戏初始化 ==========
function v2InitGame() {
    const dept = DEPT_CONFIG[v2.deptType];
    const diff = DIFFICULTY_PRESETS[v2.difficulty] || DIFFICULTY_PRESETS.normal;

    // 初始数值
    const init = { funds: 30, academicRep: 30, adminRep: 30, morale: 30, studentEval: 30 };
    Object.keys(init).forEach(k => v2[k] = init[k]);

    // 院系修正
    if (dept) {
        Object.entries(dept.init).forEach(([k, v]) => {
            if (v2[k] !== undefined) v2[k] += v;
        });
    }
    // 难度修正
    if (diff && diff.init) {
        Object.entries(diff.init).forEach(([k, v]) => {
            if (v2[k] !== undefined) v2[k] += v;
        });
    }
    v2UpdateStats();
    v2.availableDays = v2CalcAvailableDays();

    // 初始化关系
    v2.relations = JSON.parse(JSON.stringify(INITIAL_RELATION));
    v2InitStaff();

    // 初始化装饰
    v2.officeDecors = [];

    v2SaveGame('auto');
    v2RenderPlaying();
}

// ========== 主游戏渲染 ==========
function v2RenderPlaying() {
    const app = document.getElementById('app');
    app.classList.remove('page-transition-in');
    void app.offsetWidth;
    app.classList.add('page-transition-in');

    if (v2.executionMode) return; // 不要覆盖执行UI

    const dept = DEPT_CONFIG[v2.deptType];
    const meta = v2MetaLoad();

    // 学期计算
    const term = Math.floor(v2.totalMonth / 3) + 1;
    const monthInTerm = (v2.totalMonth % 3) + 1;

    let html = `<div class="top-bar">
        <span class="term-badge">第 ${term} 学期 · 第 ${monthInTerm} 月</span>
        <span style="font-size:0.82em;color:#8fa8b8;">${dept?.icon || '🏫'} ${dept?.name || ''} · ${v2.playerName}</span>
        <span class="top-link-btn" onclick="v2ToggleStaff()">👥 管理层</span>
        ${v2.titles.length ? v2.titles.map(t => `<span class="title-chip">${t.name}</span>`).join('') : ''}
        <span class="top-link-btn" onclick="v2ShowAchievements()">🏆 ${meta.points||0}</span>
    </div>
    <div class="stat-grid">
        <div class="stat-item"><span class="stat-name">💰经费</span><span class="stat-val" id="sv_funds">${v2.funds}</span></div>
        <div class="stat-item"><span class="stat-name">📚学术</span><span class="stat-val" id="sv_academicRep">${v2.academicRep}</span></div>
        <div class="stat-item"><span class="stat-name">🏛️行政</span><span class="stat-val" id="sv_adminRep">${v2.adminRep}</span></div>
        <div class="stat-item"><span class="stat-name">😊士气</span><span class="stat-val" id="sv_morale">${v2.morale}</span></div>
        <div class="stat-item"><span class="stat-name">🎓学生</span><span class="stat-val" id="sv_studentEval">${v2.studentEval}</span></div>
    </div>
    <div class="schedule-bar">📅 可用天数：${v2.availableDays - v2.usedDays}/${v2.availableDays}  |  ⚡ 已排期：${v2.actionQueue.length} 项</div>
    <div id="v2StaffPanel" class="staff-panel"></div>
    <div id="v2ActionArea"></div>
    <div id="v2MessageBoard" class="message-board"></div>
    <div id="v2ToastHost"></div>
    <div style="margin-top:10px;">
        <button class="btn secondary" onclick="v2ShowMenu()" style="text-align:center;">⚙️ 菜单（存档/读档）</button>
    </div>`;

    app.innerHTML = html;

    // 渲染已排任务
    v2RenderQueue();
    v2RenderActionTabs();
    v2RenderMessages();
    v2RenderStaffPanel();
}

// ========== 菜单系统 ==========
function v2ShowMenu() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="page-transition-in" style="max-width:500px;margin:auto;">
        <h2>⚙️ 菜单</h2>
        <button class="btn" onclick="v2SaveGame(1)">💾 存档位 1${v2HasSave(1) ? ' (已有存档)' : ''}</button>
        <button class="btn" onclick="if(v2HasSave(1)&&confirm('读取存档1？')) v2LoadGame(1)">📂 读档位 1</button>
        <button class="btn" onclick="v2SaveGame(2)">💾 存档位 2${v2HasSave(2) ? ' (已有存档)' : ''}</button>
        <button class="btn" onclick="if(v2HasSave(2)&&confirm('读取存档2？')) v2LoadGame(2)">📂 读档位 2</button>
        <button class="btn" onclick="v2SaveGame(3)">💾 存档位 3${v2HasSave(3) ? ' (已有存档)' : ''}</button>
        <button class="btn" onclick="if(v2HasSave(3)&&confirm('读取存档3？')) v2LoadGame(3)">📂 读档位 3</button>
        <button class="btn warning" onclick="if(confirm('确认重新开始？')) v2RenderSetup()" style="text-align:center;">🔄 重新开始</button>
        <button class="btn secondary" onclick="v2RenderPlaying()" style="text-align:center;">◀ 返回</button>
    </div>`;
}

function v2ShowAchievements() {
    const meta = v2MetaLoad();
    const app = document.getElementById('app');
    let html = `<div class="page-transition-in"><h2>🏆 成就</h2><div style="color:#8fa8b8;font-size:0.88em;">周目点数：${meta.points || 0} | 总运行：${meta.totalRuns || 0}</div>`;
    ACHIEVEMENTS.forEach(a => {
        const unlocked = meta.ach && meta.ach.includes(a.id);
        html += `<div style="background:#1e2b3c;margin:8px 0;padding:10px;border:2px solid ${unlocked?'#d4a017':'#3d5166'};border-radius:2px;">
            <span style="color:${unlocked?'#f5cd79':'#7f9aab'};">${unlocked?'✓':'○'} ${a.name}</span>
            <span style="font-size:0.8em;color:#b0cec4;display:block;">${a.desc} (${a.points}pt)</span>
        </div>`;
    });
    html += `<button class="btn secondary" onclick="v2RenderPlaying()" style="text-align:center;">◀ 返回</button></div>`;
    app.innerHTML = html;
}

// ========== 任务队列 ==========
function v2RenderQueue() {
    const area = document.getElementById('v2ActionArea');
    if (!area) return;
    let html = `<div class="schedule-queue">`;
    if (v2.actionQueue.length === 0) {
        html += `<div class="queue-empty">暂无排程。选择下面的行动后自动加入。</div>`;
    } else {
        v2.actionQueue.forEach((t, i) => {
            const label = t.type === 'daily' ? '📋' : t.type === 'focus' ? '🎯' : '⚡';
            html += `<div class="queue-item"><span>${label} ${t.title}</span>
                <span style="display:flex;gap:6px;"><span style="color:#8fa8b8;">${t.days}天</span>
                <span style="color:#e74c3c;cursor:pointer;" onclick="v2RemoveQueueItem(${i})">✕</span></span></div>`;
        });
    }
    html += `</div>`;
    area.innerHTML = html + `<div id="v2ActionTabs"></div>`;
}

function v2RemoveQueueItem(idx) {
    v2.actionQueue.splice(idx, 1);
    v2RenderPlaying();
}

// ========== 行动Tab ==========
function v2RenderActionTabs() {
    const tabContainer = document.getElementById('v2ActionTabs');
    if (!tabContainer) return;

    const eventsData = createEventData();
    const dailyActions = eventsData.dailyActions || [];
    const focusProjects = eventsData.focusProjects || [];

    let html = `<div class="play-tabs">
        <button class="btn" onclick="v2ShowActionTab('daily')">📋 日常事务</button>
        <button class="btn" onclick="v2ShowActionTab('focus')">🎯 重点项目</button>
        <button class="btn" onclick="v2ShowActionTab('staff')">👥 下属互动</button>
    </div>
    <div id="v2ActionTabContent"></div>
    <div class="hint-line">💡 每月需要至少排1项日常+1项重点。主事件处理完毕后可执行月度。</div>
    <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="btn" id="v2ExecBtn" onclick="v2ExecuteMonth()" ${v2.actionQueue.filter(t=>t.type==='daily').length===0||v2.actionQueue.filter(t=>t.type==='focus').length===0?'disabled':''}>▶ 执行本月排程</button>
        <button class="btn warning" onclick="v2EndTerm()" style="text-align:center;">⏭ 跳过剩余天数结束本月</button>
    </div>`;

    tabContainer.innerHTML = html;
    v2ShowActionTab('daily');
}

function v2ShowActionTab(tab) {
    const container = document.getElementById('v2ActionTabContent');
    if (!container) return;
    const eventsData = createEventData();
    const dailyActions = eventsData.dailyActions || [];
    const focusProjects = eventsData.focusProjects || [];

    if (tab === 'daily') {
        let html = `<div style="font-size:0.85em;color:#8fa8b8;margin-bottom:6px;">📋 消耗较少天数，稳定推进学院运行</div>`;
        dailyActions.forEach((a, idx) => {
            const effectStr = Object.entries(a.effect || {}).map(([k, v]) => `${{'academicRep':'学术','funds':'经费','adminRep':'行政','morale':'士气','studentEval':'学生'}[k]||k}${v>=0?'+':''}${v}`).join(', ');
            html += `<button class="btn" data-act-tab="daily" data-act-idx="${idx}">
                ${a.text} <span style="color:#8fa8b8;font-size:0.8em;">| ${a.days}天 | ${effectStr}</span>
            </button>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('[data-act-tab="daily"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.actIdx);
                const a = dailyActions[idx];
                if (!a) return;
                v2AddAction('daily', a.id, a.text, a.days, a.effect);
            });
        });
    } else if (tab === 'focus') {
        let html = `<div style="font-size:0.85em;color:#8fa8b8;margin-bottom:6px;">🎯 消耗天数较多，效果显著</div>`;
        focusProjects.forEach((a, idx) => {
            const effectStr = Object.entries(a.effect || {}).map(([k, v]) => `${{'academicRep':'学术','funds':'经费','adminRep':'行政','morale':'士气','studentEval':'学生'}[k]||k}${v>=0?'+':''}${v}`).join(', ');
            html += `<button class="btn" data-act-tab="focus" data-act-idx="${idx}">
                ${a.text} <span style="color:#8fa8b8;font-size:0.8em;">| ${a.days}天 | ${effectStr}</span>
            </button>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('[data-act-tab="focus"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.actIdx);
                const a = focusProjects[idx];
                if (!a) return;
                v2AddAction('focus', a.id, a.text, a.days, a.effect);
            });
        });
    } else if (tab === 'staff') {
        v2RenderStaffActions(container);
    }
}

function v2AddAction(type, id, title, days, effect) {
    const remaining = v2.availableDays - v2.usedDays;
    const totalDays = v2.actionQueue.reduce((s, t) => s + t.days, 0) + days;
    if (totalDays > remaining) return alert(`剩余天数不足（还剩${remaining}天，需要${days}天）`);
    v2.actionQueue.push({ type, id, title, days, effect });
    v2RenderPlaying();
}

// ========== 下属互动 ==========
function v2RenderStaffPanel() {
    const panel = document.getElementById('v2StaffPanel');
    if (!panel || !v2.staff) return;
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="color:#f5cd79;font-weight:bold;">👥 核心管理层</span>
        <span class="panel-icon" onclick="v2ToggleStaff()">[收起]</span>
    </div>`;
    v2.staff.forEach(s => {
        html += `<div class="staff-card">
            <div class="staff-name">${s.name}</div>
            <div class="staff-info">${s.title} · ${s.trait}</div>
            <div class="staff-info">能力: ${s.ability} | 忠诚: ${s.loyalty}</div>
            <div class="staff-info" style="font-size:0.78em;color:#7f9aab;">${s.profile}${s.flaw ? ' ⚠️' + s.flaw : ''}</div>
        </div>`;
    });
    panel.innerHTML = html;
}

function v2ToggleStaff() {
    const panel = document.getElementById('v2StaffPanel');
    if (!panel) return;
    panel.classList.toggle('open');
}

function v2RenderStaffActions(container) {
    if (!container) return;
    let html = `<div style="font-size:0.85em;color:#8fa8b8;margin-bottom:6px;">👥 与下属谈心交流，提升忠诚</div>`;
    v2.staff.forEach((s, idx) => {
        html += `<button class="btn" data-staff-talk="${idx}">
            💬 与 ${s.name}（${s.title}）谈心 <span style="color:#8fa8b8;font-size:0.8em;">| 当前忠诚 ${s.loyalty} | 消耗精力10</span>
        </button>`;
    });
    html += `<div class="hint-line">提升忠诚可增加下属执行任务时的效果加成的上限比例。</div>`;
    container.innerHTML = html;
    container.querySelectorAll('[data-staff-talk]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.staffTalk);
            v2StaffTalk(idx);
        });
    });
}

function v2StaffTalk(idx) {
    if (v2.energy < 10) return alert('精力不足！');
    const staff = v2.staff[idx];
    if (!staff) return;
    v2.energy -= 10;
    staff.loyalty = clamp(staff.loyalty + Math.floor(Math.random() * 8) + 3, 0, 100);
    v2PushMail(`💬 与 ${staff.name} 谈心，忠诚提升至 ${staff.loyalty}`);
    v2RenderPlaying();
}

// ========== 消息渲染 ==========
function v2RenderMessages() {
    const board = document.getElementById('v2MessageBoard');
    if (!board) return;
    if (v2.messages.length === 0) {
        board.innerHTML = `<div style="color:#7f9aab;font-size:0.82em;padding:4px;">暂无消息</div>`;
        return;
    }
    board.innerHTML = v2.messages.slice(-8).map(m => `<div class="msg-item">${m.text}</div>`).join('');
}

// ========== 月度排程执行 ==========
// ===== v2 execution functions (extracted from game_exec_only.js) =====
let v2ExecAutoTimer = null;

function v2ExecuteMonth() {
    const dailyCount = v2.actionQueue.filter(x => x.type === 'daily').length;
    const focusCount = v2.actionQueue.filter(x => x.type === 'focus').length;
    if (!dailyCount || !focusCount || v2.currentEvent) return alert('请先处理主事件，并排至少1项日常+1项重点。');
    
    const appV2 = document.getElementById('app');
    appV2.classList.add('page-transition-out');
    
    setTimeout(() => {
        const queueSnap = v2.actionQueue.map(t => ({ ...t }));
        v2.pendingExecutionQueue = queueSnap;
        v2.executionPhase = 'intro';
        v2.executionIndex = 0;
        v2.executionLogs = [];
        // 从多个事件池抽取随机事件（独立通用池 + 真实校园池）
        const allRandomEvents = [...GENERIC_RANDOM_EVENTS, ...REAL_UNIVERSITY_EVENTS];
        const shuffled = allRandomEvents.sort(() => Math.random() - 0.5);
        v2.executionRandomEvents = shuffled.slice(0, Math.min(3, shuffled.length));
        v2.executionRandomEventIdx = 0;
        v2.executionPendingPersonal = !v2.flags.termPersonalStoryUsed && Math.random() < 0.6;
        v2.executionMode = true;
        v2RenderExecution();
    }, 250);
}

function v2ExecShowStatToast(name, oldVal, newVal) {
    const diff = newVal - oldVal;
    if (diff === 0) return;
    const isUp = diff > 0;
    const statItems = document.querySelectorAll('.exec-stats .stat-item');
    for (const item of statItems) {
        const nameEl = item.querySelector('.stat-name');
        if (nameEl && nameEl.textContent.includes(name)) {
            const valEl = item.querySelector('.stat-val');
            if (valEl) {
                const toast = document.createElement('span');
                toast.className = isUp ? 'stat-toast-up' : 'stat-toast-down';
                toast.textContent = isUp ? `+${diff}` : `${diff}`;
                const rect = valEl.getBoundingClientRect();
                toast.style.left = rect.left + 'px';
                toast.style.top = (rect.top - 4) + 'px';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1300);
                valEl.classList.remove('stat-flash-up', 'stat-flash-down');
                void valEl.offsetWidth;
                valEl.classList.add(isUp ? 'stat-flash-up' : 'stat-flash-down');
                setTimeout(() => valEl.classList.remove('stat-flash-up', 'stat-flash-down'), 850);
            }
            break;
        }
    }
}

function v2RenderExecution() {
    if (v2.typingTimer) { clearInterval(v2.typingTimer); v2.typingTimer = null; }
    if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    
    const appV2 = document.getElementById('app');
    const dept = DEPT_CONFIG[v2.deptType];
    
    v2._execStatSnapshot = {
        funds: v2.funds,
        academicRep: v2.academicRep,
        adminRep: v2.adminRep,
        morale: v2.morale,
        studentEval: v2.studentEval
    };
    
    appV2.innerHTML = `<div class="exec-stage page-transition-in" id="v2ExecStage">
        <div class="exec-stage-header">
            <h2>${dept.icon} ${dept.name} · ${v2.playerName}</h2>
            <span class="exec-close" onclick="v2AbortExecution()">✕ 放弃执行</span>
        </div>
        <div class="exec-stats" id="v2ExecStats">
            <div class="stat-item"><span class="stat-name">💰经费</span><span class="stat-val" data-stat="funds">${v2.funds}</span></div>
            <div class="stat-item"><span class="stat-name">📚学术</span><span class="stat-val" data-stat="academicRep">${v2.academicRep}</span></div>
            <div class="stat-item"><span class="stat-name">🏛️行政</span><span class="stat-val" data-stat="adminRep">${v2.adminRep}</span></div>
            <div class="stat-item"><span class="stat-name">😊士气</span><span class="stat-val" data-stat="morale">${v2.morale}</span></div>
            <div class="stat-item"><span class="stat-name">🎓学生</span><span class="stat-val" data-stat="studentEval">${v2.studentEval}</span></div>
        </div>
        <div class="exec-progress" id="v2ExecProgress"></div>
        <div class="exec-content" id="v2ExecContent">
            <div class="exec-content-stage" id="v2ExecStagePane">
                <div class="exec-narr" id="v2ExecNarr"></div>
            </div>
        </div>
        <div class="exec-actions" id="v2ExecActions">
            <button class="btn skip" id="v2ExecSkipText" style="display:none">⏩ 跳过打字</button>
            <button class="btn" id="v2ExecNextBtn" style="display:none">继续 →</button>
            <span class="exec-auto-label" style="display:none" id="v2ExecAutoLabel">即将自动继续…</span>
        </div>
    </div>`;
    
    const tasks = [...v2.pendingExecutionQueue];
    const dailyTasks = tasks.filter(t => t.type === 'daily');
    const focusTasks = tasks.filter(t => t.type === 'focus');
    
    const timeline = [];
    const openingPool = [
        '本月工作正式启动。走廊里已有人在等你的签字。',
        '新一个月的排程已经就绪。办公桌上堆着今天的文件。',
        '会议室预约已排满。你看了看日程表，深吸一口气。',
        '清晨的阳光透过百叶窗洒在办公桌上。又一个忙碌的月份开始了。'
    ];
    timeline.push({ type: 'narration', text: v2Pick(openingPool) });
    
    let taskGroups = [];
    taskGroups = taskGroups.concat(dailyTasks);
    taskGroups = taskGroups.concat(focusTasks);
    
    taskGroups.forEach((task, idx) => {
        timeline.push({ type: 'task', task });
        if (idx < taskGroups.length - 1) {
            if (Math.random() < 0.4) {
                const pool = v2Pick([STUDENT_COMMENTS, TEACHER_COMMENTS, LEADERSHIP_COMMENTS]);
                const mood = Math.random() < 0.5 ? 'positive' : 'negative';
                timeline.push({ type: 'comment', text: v2Pick(pool[mood]) });
            }
        }
    });
    
    if (v2.executionPendingPersonal) {
        timeline.push({ type: 'personalStory' });
    }
    
    const closingPool = [
        '所有排程任务执行完毕。你长舒一口气，靠在椅背上。窗外天色已暗。',
        '今天的工作告一段落。你整理了一下桌面，关掉了显示器。',
        '最后一个任务完成时，办公室里已经只剩下你一个人了。'
    ];
    timeline.push({ type: 'narration', text: v2Pick(closingPool) });
    
    if (v2.funds < 15) {
        timeline.push({ type: 'narration', text: '财务处的邮件还在收件箱里闪烁——经费确实吃紧了。' });
    }
    
    v2.executionTimeline = timeline;
    v2.executionStep = 0;
    
    v2RenderExecProgress();
    setTimeout(() => v2ExecNextStep(), 400);
}

function v2RenderExecProgress() {
    const container = document.getElementById('v2ExecProgress');
    if (!container || !v2.executionTimeline) return;
    const total = v2.executionTimeline.length;
    container.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = 'exec-progress-dot';
        dot.dataset.idx = i;
        if (i < v2.executionStep) dot.classList.add('done');
        else if (i === v2.executionStep) dot.classList.add('current');
        const stepType = v2.executionTimeline[i]?.type;
        if (stepType === 'event') dot.classList.add('event');
        else if (stepType === 'comment') dot.classList.add('comment');
        else if (stepType === 'personalStory') dot.classList.add('story');
        container.appendChild(dot);
    }
}

function v2UpdateExecProgress() {
    const dots = document.querySelectorAll('.exec-progress-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('done', 'current');
        if (i < v2.executionStep) dot.classList.add('done');
        else if (i === v2.executionStep) dot.classList.add('current');
    });
}

function v2ExecNextStep() {
    if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    
    if (v2.executionRandomEvents && v2.executionRandomEvents.length > 0 && Math.random() < 0.15) {
        const ev = v2.executionRandomEvents.shift();
        if (ev) return v2ExecShowIndependentEvent(ev);
    }
    
    if (v2.executionStep >= v2.executionTimeline.length) {
        return v2ExecFinish();
    }
    
    const step = v2.executionTimeline[v2.executionStep];
    const narrEl = document.getElementById('v2ExecNarr');
    const stagePane = document.getElementById('v2ExecStagePane');
    const nextBtn = document.getElementById('v2ExecNextBtn');
    const skipBtn = document.getElementById('v2ExecSkipText');
    const actions = document.getElementById('v2ExecActions');
    if (!narrEl || !stagePane) return;
    
    v2.executionStep++;
    v2UpdateExecProgress();
    
    stagePane.className = 'exec-content-stage slide-up-in';
    stagePane.innerHTML = '';
    if (nextBtn) nextBtn.style.display = 'none';
    if (skipBtn) skipBtn.style.display = 'none';
    const autoLabel = document.getElementById('v2ExecAutoLabel');
    if (autoLabel) autoLabel.style.display = 'none';
    
    if (step.type === 'narration') {
        stagePane.innerHTML = `<div class="exec-narr exec-typewriter-cursor" id="v2ExecNarrActive"></div>`;
        const activeEl = document.getElementById('v2ExecNarrActive');
        if (activeEl) {
            v2Typewriter(step.text, 'v2ExecNarrActive', 'v2ExecSkipText', () => {
                if (nextBtn) nextBtn.style.display = 'inline-block';
                v2ExecAutoTimer = setTimeout(() => {
                    if (nextBtn && nextBtn.style.display !== 'none') { nextBtn.click(); }
                }, 3000);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        if (skipBtn) skipBtn.style.display = 'inline-block';
        nextBtn.onclick = () => { if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
    } else if (step.type === 'comment') {
        stagePane.classList.add('highlight-comment');
        stagePane.innerHTML = `<h3>💬 校园声音</h3><div class="exec-narr exec-typewriter-cursor" id="v2ExecCommentActive"></div>`;
        const activeEl = document.getElementById('v2ExecCommentActive');
        if (activeEl) {
            v2Typewriter(step.text, 'v2ExecCommentActive', 'v2ExecSkipText', () => {
                if (nextBtn) nextBtn.style.display = 'inline-block';
                v2ExecAutoTimer = setTimeout(() => { if (nextBtn) nextBtn.click(); }, 2500);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        if (skipBtn) skipBtn.style.display = 'inline-block';
        nextBtn.onclick = () => { if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
    } else if (step.type === 'task') {
        const task = step.task;
        const feedback = v2ResolveTask(task);
        v2.executionLogs.push(feedback);
        
        const oldStats = { ...v2._execStatSnapshot };
        
        const taskTypeLabel = task.type === 'daily' ? '📋 日常' : '🎯 重点';
        stagePane.innerHTML = `<div class="exec-task-title">${taskTypeLabel} · ${task.title}</div>
            <div class="exec-narr exec-typewriter-cursor" id="v2ExecTaskActive"></div>`;
        
        v2UpdateStats();
        v2ExecRefreshStatValues(oldStats);
        
        if (nextBtn) nextBtn.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'inline-block';
        
        const activeEl = document.getElementById('v2ExecTaskActive');
        if (activeEl) {
            v2Typewriter(feedback, 'v2ExecTaskActive', 'v2ExecSkipText', () => {
                if (nextBtn) nextBtn.style.display = 'inline-block';
                v2ExecAutoTimer = setTimeout(() => { if (nextBtn) nextBtn.click(); }, 2500);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        
        nextBtn.onclick = () => { if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
    } else if (step.type === 'personalStory') {
        stagePane.classList.add('highlight-personal');
        const stories = [
            { title: '家人的来电', text: '你接到了家人的电话，她说："这个周末有空回来吃饭吗？"', feedback: '你答应这周一定回去。心里泛起一丝愧疚。', effect: { morale: 3 } },
            { title: '老同学的消息', text: '一位老同学发来微信："听说你在带学院？有空出来聚聚。"', feedback: '你回复"有空一定"，然后把手机放回抽屉。', effect: { morale: 2 } },
            { title: '深夜的办公室', text: '你在加班整理文件时，发现抽屉里有一张学生画的贺卡。', feedback: '贺卡上写着"谢谢院长"。你把它贴在了办公桌上。', effect: { morale: 4 } },
            { title: '午后的散步', text: '你难得去校园里走了一圈。阳光很好，学生们在草坪上讨论课题。', feedback: '你想起自己当年读书时的样子。心情好了些。', effect: { morale: 3, studentEval: 1 } },
            { title: '一份意外的礼物', text: '前台转交给你一个快递，里面是一本书和一张便签："院长辛苦了。"', feedback: '你翻了几页，发现是刚出版的教育管理类书籍。', effect: { morale: 2, academicRep: 1 } },
            { title: '食堂的偶遇', text: '你在食堂排队时，几个学生认出了你，邀请你一起坐。', feedback: '聊了聊最近的课程和校园生活，气氛轻松。', effect: { morale: 3, studentEval: 2 } },
            { title: '书架上的照片', text: '你整理书架时翻出上学期的毕业合影。照片上大家笑得都很开心。', feedback: '你把相框重新擦净，放在了更显眼的位置。', effect: { morale: 2 } }
        ];
        const story = v2Pick(stories);
        v2.flags.termPersonalStoryUsed = true;
        v2.executionLogs.push(story.feedback);
        
        const oldStats = { ...v2._execStatSnapshot };
        v2ApplyEffect(story.effect);
        v2UpdateStats();
        v2ExecRefreshStatValues(oldStats);
        
        stagePane.innerHTML = `<h3>🎭 个人插曲：${story.title}</h3>
            <div class="exec-narr exec-typewriter-cursor" id="v2ExecPersonalActive"></div>`;
        const activeEl = document.getElementById('v2ExecPersonalActive');
        if (activeEl) {
            v2Typewriter(story.feedback, 'v2ExecPersonalActive', 'v2ExecSkipText', () => {
                if (nextBtn) nextBtn.style.display = 'inline-block';
                v2ExecAutoTimer = setTimeout(() => { if (nextBtn) nextBtn.click(); }, 2500);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        if (skipBtn) skipBtn.style.display = 'inline-block';
        nextBtn.onclick = () => { if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
    }
}

function v2ExecShowIndependentEvent(ev) {
    const narrEl = document.getElementById('v2ExecNarr');
    const nextBtn = document.getElementById('v2ExecNextBtn');
    if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    const autoLabel = document.getElementById('v2ExecAutoLabel');
    if (autoLabel) autoLabel.style.display = 'none';
    
    const popup = document.createElement('div');
    popup.className = 'exec-event-popup';
    popup.id = 'v2ExecEventPopup';
    popup.innerHTML = `<div class="exec-event-panel slide-up-in">
        <h3>⚡ 突发事件：${ev.title}</h3>
        <div class="event-text">${ev.text}</div>
        <div class="event-choices">
            ${ev.choices.map((c, i) => `<button class="btn" data-choice="${i}">${c.text}</button>`).join('')}
        </div>
    </div>`;
    document.body.appendChild(popup);
    
    const oldStats = { ...v2._execStatSnapshot };
    
    popup.querySelectorAll('[data-choice]').forEach(b => {
        b.onclick = () => {
            const idx = Number(b.dataset.choice);
            const choice = ev.choices[idx];
            v2.executionLogs.push(choice.feedback);
            v2ApplyEffect(choice.effect ? choice.effect : (choice.effects || {}));
            v2UpdateStats();
            v2ExecRefreshStatValues(oldStats);
            
            popup.remove();
            if (nextBtn) nextBtn.style.display = 'inline-block';
            nextBtn.onclick = () => { if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
        };
    });
}

function v2ExecRefreshStatValues(oldStats) {
    const newStats = {
        funds: v2.funds,
        academicRep: v2.academicRep,
        adminRep: v2.adminRep,
        morale: v2.morale,
        studentEval: v2.studentEval
    };
    
    const statVals = document.querySelectorAll('#v2ExecStats .stat-val');
    statVals.forEach(el => {
        const statKey = el.dataset.stat;
        if (statKey && oldStats[statKey] !== undefined) {
            const oldVal = oldStats[statKey];
            const newVal = newStats[statKey];
            el.textContent = newVal;
            v2ExecShowStatToast(statKey, oldVal, newVal);
        }
    });
    
    v2._execStatSnapshot = newStats;
}

function v2ExecFinish() {
    if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    const fundsBefore = v2.funds;
    const queueSnap = v2.pendingExecutionQueue;
    const meta = v2MetaLoad();
    meta.ach = meta.ach || [];
    
    if (fundsBefore < 10 && queueSnap && queueSnap.some(t => t.type === 'focus')) {
        if (!meta.ach.includes('low_fund_meeting')) {
            const a = ACHIEVEMENTS.find(x => x.id === 'low_fund_meeting');
            if (a) {
                meta.ach.push('low_fund_meeting');
                meta.points += a.points;
                v2PushMail(`成就解锁：${a.name}（+${a.points}周目点）`);
                v2QueueAchievementToast(a.name, a.points);
            }
        }
    }
    v2MetaSave(meta);
    const passive = CURRICULUM_PASSIVE[v2.curriculum] || CURRICULUM_PASSIVE.balanced;
    v2ApplyEffect(passive);
    v2UnlockTitles();
    v2CheckAchievements();
    v2UpdateStats();
    const prevEval = v2.prevEval || v2.studentEval;
    if (v2.studentEval > prevEval) v2.admissionStreak += 1;
    else v2.admissionStreak = 0;
    v2.prevEval = v2.studentEval;
    v2.carryoverDays = Math.max(0, v2.usedDays - v2.availableDays);
    
    // 进度到下个月
    v2.totalMonth += 1;
    v2.month = (v2.totalMonth % 3) + 1;
    v2.flags.termPersonalStoryUsed = false;
    
    // 检查学期结束弧线
    const newTerm = Math.floor(v2.totalMonth / 3) + 1;
    if (newTerm > v2.semester) {
        v2.semester = newTerm;
        // 学期过渡回顾
    }
    
    // 重置月度资源
    v2.energy = 100;
    v2.usedDays = 0;
    v2.actionQueue = [];
    v2.availableDays = v2CalcAvailableDays();
    
    // 结算过渡效率修正
    const prevLogs = v2.executionLogs || [];
    
    // 清理执行状态
    v2.pendingExecutionQueue = null;
    v2.executionTimeline = null;
    v2.executionStep = 0;
    v2.executionRandomEvents = null;
    v2.executionPendingEvent = null;
    v2.executionMode = false;
    v2.executionQueue = null;
    v2.currentEvent = null;
    v2.currentEventResolved = false;
    v2.termEndShown = false;
    
    // 检测学期结束
    v2CheckEndings();
    if (v2.gameOver) return;
    
    // 执行阶段UI滑出
    const execStage = document.getElementById('v2ExecStage');
    if (execStage) {
        execStage.style.animation = 'slideDownOut 0.3s ease both';
        setTimeout(() => {
            execStage.remove();
            v2ShowMonthRecap(prevLogs);
            const recapOverlay = document.querySelector('.recap-overlay');
            if (recapOverlay) recapOverlay.style.animation = 'pageFadeIn 0.35s ease both';
        }, 350);
    } else {
        v2ShowMonthRecap(prevLogs);
    }
}

function v2AbortExecution() {
    if (!confirm('确定放弃当月的执行进度？已消耗的天数不会退还。')) return;
    if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    v2.executionMode = false;
    v2.pendingExecutionQueue = null;
    v2.executionTimeline = null;
    v2.executionStep = 0;
    v2.executionRandomEvents = null;
    v2.executionPendingEvent = null;
    document.getElementById('v2ExecStage')?.remove();
    v2RenderPlaying();
}

// ========== 任务解析 ==========
function v2ResolveTask(task) {
    v2ApplyEffect(task.effect);
    v2PushMail(`✅ 完成：${task.title}`);
    
    const feedbackPool = {
        'leave': [
            '你协调了几位教师的课时，排班表终于完整了。教师们松了口气。',
            '请假流程走完，你发现这周又少了一个能代课的人。'
        ],
        'dorm': [
            '你亲自去了一趟宿舍区，当场给后勤打了电话。墙皮脱落的房间被列入了维修计划。',
            '处理结果在班群传开了，有人截图发到校外论坛。影响在扩散。'
        ],
        'repair': [
            '设备报修单积压了一阵，你打电话催了后勤两次。总算有人来了。',
            '维修人员检查后发现是配件问题，需要额外申请预算。'
        ],
        'finance': [
            '你花了整整一个上午签字，报销单已经堆到了键盘旁边。',
            '财务处的老师发来消息："终于不用再追着你们要材料了。"'
        ],
        'forum': [
            '你仔细看了一遍热帖，在回帖框里打了几行字，删了又打，最后发了出去。',
            '你决定不正面回应，而是安排了一个线下学生座谈会。'
        ],
        'research': [
            '你泡在办公室里看完了整本项目申请书，改了十几处标注。合作方回复："比预期好。"',
            '研究报告的初稿出来了。数据还不错，但讨论部分还需要大改。'
        ],
        'teaching': [
            '教学改革会议开了一整个下午。几位老教授的意见虽然尖锐，但最终达成了共识。',
            '课程大纲的修订稿交到你手上时，页脚还有茶水打湿的痕迹。'
        ],
        'enterprise': [
            '企业方的副总裁亲自接待了你。对方表示愿意共建一个联合实验室。',
            '合作协议的细节在会议室里磨了两个小时，最终双方都做出了让步。'
        ],
        'team': [
            '团建活动选在了学校附近的一个农家乐。气氛比想象中轻松。',
            '你注意到在烧烤炉边，平时不太说话的两位年轻老师居然聊得很投缘。'
        ]
    };
    
    const pool = feedbackPool[task.id] || feedbackPool.leave;
    return v2Pick(pool);
}

// ========== 跳过结束本月 ==========
function v2EndTerm() {
    const passive = CURRICULUM_PASSIVE[v2.curriculum] || CURRICULUM_PASSIVE.balanced;
    v2ApplyEffect(passive);
    v2UpdateStats();
    
    v2.totalMonth += 1;
    v2.month = (v2.totalMonth % 3) + 1;
    const newTerm = Math.floor(v2.totalMonth / 3) + 1;
    if (newTerm > v2.semester) v2.semester = newTerm;
    
    v2.flags.termPersonalStoryUsed = false;
    v2.energy = 100;
    v2.usedDays = 0;
    v2.actionQueue = [];
    v2.availableDays = v2CalcAvailableDays();
    v2.currentEvent = null;
    v2.currentEventResolved = false;
    
    v2CheckEndings();
    if (v2.gameOver) return;
    
    v2PushMail(`⏭️ 跳过剩余天数进入第 ${newTerm} 学期第 ${v2.month} 月`);
    v2RenderPlaying();
}

// ========== 月度回顾 ==========
function v2ShowMonthRecap(logs) {
    const stats = { funds: v2.funds, academicRep: v2.academicRep, adminRep: v2.adminRep, morale: v2.morale, studentEval: v2.studentEval };
    
    // 学期末（第3个月）叙事
    const isTermEnd = v2.month === 1; // 刚过完三个月，重新从1开始
    let termNarrative = '';
    if (isTermEnd && v2.semester > 1) {
        const prevStats = { funds: v2.funds - 5, reputation: v2.academicRep - 3, morale: v2.morale - 2, studentEval: v2.studentEval - 2 };
        termNarrative = buildTermEndNarrative(v2.semester - 1, stats, prevStats);
    }
    
    const app = document.getElementById('app');
    let logHtml = logs && logs.length ? logs.slice(-5).map(l => `<div>• ${l}</div>`).join('') : '<div style="color:#7f9aab;">暂无详细记录</div>';
    
    app.innerHTML = `<div class="recap-overlay page-transition-in">
        <div class="recap-panel slide-up-in">
            <h3>📊 月度结算 · 第 ${Math.floor(v2.totalMonth / 3) + 1} 学期 第 ${(v2.totalMonth % 3) + 1} 月</h3>
            <div class="recap-stat">💰 经费：${stats.funds}</div>
            <div class="recap-stat">📚 学术声望：${stats.academicRep}</div>
            <div class="recap-stat">🏛️ 行政信誉：${stats.adminRep}</div>
            <div class="recap-stat">😊 教师士气：${stats.morale}</div>
            <div class="recap-stat">🎓 学生评价：${stats.studentEval}</div>
            ${isTermEnd && termNarrative ? `<div class="recap-quote">📜 学期回顾<br>${termNarrative}</div>` : ''}
            <div class="recap-events"><div style="color:#8fa8b8;margin-bottom:4px;">📋 本月执行记录</div>${logHtml}</div>
            <button class="btn" onclick="v2ContinueGame()">继续下一月 →</button>
        </div>
    </div>`;
}

function v2ContinueGame() {
    const overlay = document.querySelector('.recap-overlay');
    if (overlay) {
        overlay.style.animation = 'pageFadeOut 0.25s ease both';
        setTimeout(() => { overlay.remove(); v2RenderPlaying(); }, 260);
    } else {
        v2RenderPlaying();
    }
}

// ========== 结局检测 ==========
function v2CheckEndings() {
    // 财务危机
    if (v2.funds <= -10) {
        return v2EndWithMessage('💰 财务危机\n\n学院账户连续赤字。校财务处冻结了你的审批权限。周校长约谈了你，语气沉重：「我知道不容易，但这个数字我没办法向校务会交代。」\n\n你收拾办公桌的时候，看到抽屉里还放着上学期学生写的感谢信。你把信放回抽屉，关上了门。', 'gameover');
    }
    // 士气崩溃
    if (v2.morale <= 0) {
        return v2EndWithMessage('😔 众叛亲离\n\n教研室已经空了半个。三位骨干教师提交了调动申请，剩下的人也没有了正常工作状态。校务会上有人公开说：「这个系的管理出了大问题。」\n\n你在走廊里听到有人在小声议论：「这样的领导怎么还没走？」', 'gameover');
    }
    // 任期结束（8学期 = 24个月）
    if (v2.totalMonth >= 24) {
        const summary = v2BuildEndSummary();
        return v2EndWithMessage(`🎉 任期结束\n\n你完成了 8 个学期的院长任期。\n\n${summary}`, 'ending');
    }
    // 高升结局
    if (v2.academicRep >= 85 && v2.funds >= 75) {
        return v2EndWithMessage('🚀 高升结局\n\n你的学术声誉和经费管理能力引起了校领导的注意。在一次闭门会议后，周校长亲自打电话：「上面有一个副校长的位置，我和书记都推荐了你。」\n\n这当然不是终点，但至少证明——你做对了什么。', 'ending');
    }
    // 学生口碑爆棚
    if (v2.studentEval >= 85 && v2.morale >= 75 && v2.academicRep >= 70) {
        return v2EndWithMessage('🌸 桃李满天下\n\n校友会年度报告上，你的名字被反复提及。学生评价调查中，「推荐院长」的比例达到了历史最高。\n\n一位刚毕业的学生在朋友圈里写道：「如果大学有形状，那大概就是我们院长的样子。」\n\n你看到这条动态时，默默截了图。', 'ending');
    }
    return false;
}

function v2EndWithMessage(msg, type) {
    v2.gameOver = true;
    v2.executionMode = false;
    if (v2ExecAutoTimer) { clearInterval(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    
    // 更新周目数据
    const meta = v2MetaLoad();
    meta.totalRuns = (meta.totalRuns || 0) + 1;
    const score = Math.floor(v2.academicRep + v2.adminRep + v2.morale + v2.studentEval + v2.funds);
    if (score > (meta.bestScore || 0)) meta.bestScore = score;
    v2MetaSave(meta);
    
    const app = document.getElementById('app');
    app.innerHTML = `<div class="page-transition-in" style="max-width:600px;margin:auto;">
        <h2>${type === 'ending' ? '🎊 任期完结' : '💔 提前结束'}</h2>
        <div class="story-box expanded">${msg}</div>
        <div style="margin:14px 0;text-align:center;">
            <div class="recap-stat">📊 最终统计</div>
            <div class="recap-stat">💰经费 ${v2.funds} | 📚学术 ${v2.academicRep} | 🏛️行政 ${v2.adminRep}</div>
            <div class="recap-stat">😊士气 ${v2.morale} | 🎓学生 ${v2.studentEval}</div>
            <div class="recap-stat">总月数：${v2.totalMonth} | 称号：${v2.titles.length}</div>
            <div class="recap-stat">周目点数：${meta.points || 0} | 最高分：${meta.bestScore || 0}</div>
        </div>
        <button class="btn" onclick="v2RenderSetup()" style="text-align:center;">🔄 再来一次</button>
        <button class="btn secondary" onclick="v2ShowAchievements()" style="text-align:center;">🏆 成就查看</button>
    </div>`;
}

function v2BuildEndSummary() {
    const parts = [];
    if (v2.academicRep >= 70) parts.push('学术声望在你任期内显著提升，多名教师获批国家级项目。');
    else if (v2.academicRep >= 40) parts.push('学术端保持平稳运行，没有大起大落。');
    else parts.push('学术端表现欠佳，几项重点项目未能如期推进。');
    
    if (v2.studentEval >= 70) parts.push('学生对学院的管理高度认可，招生咨询量逐年上升。');
    else if (v2.studentEval >= 40) parts.push('学生评价一般，没有大的风波就是好消息。');
    else parts.push('学生满意度偏低，下学期继任者恐怕要面对不少遗留问题。');
    
    if (v2.morale >= 70) parts.push('教师团队凝聚力强，不少人表示「这是近几年氛围最好的时期」。');
    else if (v2.morale >= 40) parts.push('教师士气起伏不大，但缺乏明显的正向激励。');
    else parts.push('教师流失率偏高，继任者需要优先稳定队伍。');
    
    if (v2.funds >= 50) parts.push('财务稳健，离职时账户上留有可观的余额。');
    else if (v2.funds >= 0) parts.push('财务基本打平，没有留下烂摊子。');
    else parts.push('财务赤字节节攀升，新院长上任后的第一件事大概就是找钱。');
    
    parts.push('\n感谢你完成了一届完整的院长任期。');
    return parts.join('\n');
}

// ========== 打字机效果 ==========
function v2Typewriter(text, targetId, skipBtnId, onComplete) {
    const el = document.getElementById(targetId);
    if (!el) return;
    
    let idx = 0;
    if (v2.typingTimer) { clearInterval(v2.typingTimer); }
    
    el.textContent = '';
    const speed = 28;
    
    function typeChar() {
        if (idx < text.length) {
            el.textContent += text[idx];
            idx++;
            v2.typingTimer = setTimeout(typeChar, speed);
        } else {
            v2.typingTimer = null;
            if (onComplete) onComplete();
        }
    }
    
    // 绑定跳过按钮
    const skipBtn = document.getElementById(skipBtnId);
    if (skipBtn) {
        skipBtn.onclick = () => {
            if (v2.typingTimer) { clearInterval(v2.typingTimer); v2.typingTimer = null; }
            el.textContent = text;
            if (onComplete) onComplete();
        };
        skipBtn.style.display = 'inline-block';
    }
    
    typeChar();
}

// ========== 暴露全局接口 ==========
window.v2RenderSetup = v2RenderSetup;
window.v2RenderPlaying = v2RenderPlaying;
window.v2RenderGameOver = v2GameOverRender;
window.v2ToggleStaff = v2ToggleStaff;
window.v2ShowMenu = v2ShowMenu;
window.v2ShowAchievements = v2ShowAchievements;
window.v2ShowActionTab = v2ShowActionTab;
window.v2AddAction = v2AddAction;
window.v2RemoveQueueItem = v2RemoveQueueItem;
window.v2ExecuteMonth = v2ExecuteMonth;
window.v2AbortExecution = v2AbortExecution;
window.v2EndTerm = v2EndTerm;
window.v2ContinueGame = v2ContinueGame;
window.v2StaffTalk = v2StaffTalk;
window.v2SaveGame = v2SaveGame;
window.v2LoadGame = v2LoadGame;
window.v2HasSave = v2HasSave;
window.v2InitGame = v2InitGame;
window.v2Typewriter = v2Typewriter;

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否有自动存档
    if (v2HasSave('auto')) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="page-transition-in" style="max-width:500px;margin:auto;text-align:center;">
            <h2>🏫 院长模拟器</h2>
            <div style="margin:20px 0;color:#8fa8b8;font-size:0.88em;">检测到之前的存档</div>
            <button class="btn" onclick="if(v2LoadGame('auto')){}" style="text-align:center;margin-bottom:6px;">📂 继续上次的任期</button>
            <button class="btn warning" onclick="v2RenderSetup()" style="text-align:center;">🔄 重新开始</button>
        </div>`;
    } else {
        v2RenderSetup();
    }
});

// ===== 兼容旧版 API =====
function v2GameOverRender() {
    // 已弃用，使用v2EndWithMessage替代
}