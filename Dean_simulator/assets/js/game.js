// ===== 院长模拟器 · 完整游戏引擎 =====
import {
    INITIAL_RELATION, BACKGROUND_POOL, STAFF_TEMPLATES, STAFF_PERSONA_POOL,
    DEPT_CONFIG, CURRICULUM_PASSIVE, OFFICE_DECOR, TITLE_RULES, ACHIEVEMENTS,
    DIFFICULTY_PRESETS, STUDENT_ARCHETYPES,
    scaleTaskEffectGains
} from './config.js?v=ach1';
import {
    STUDENT_COMMENTS, TEACHER_COMMENTS, LEADERSHIP_COMMENTS,
    GENERIC_RANDOM_EVENTS, REAL_UNIVERSITY_EVENTS, PET_EVENTS,
    ENDING_HOOK_EVENTS,
    STUDENT_INTERACT_EVENTS, buildTermEndNarrative, createEventData
} from './events.js';

// ========== 辅助函数 ==========
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function v2Pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function v2RandomInRange(range) {
    if (!range || range.length < 2) return null;
    const [lo, hi] = range;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
}

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
        availableDays: 28,
        carryoverDays: 0,
        energy: 100,

        staff: [],
        relations: {},
        flags: {
            reforms: 0,
            termPersonalStoryUsed: false,
            adoptedPets: [],
            metStudents: [],
            scandalSuppressStage: 0,
            academicDropStreak: 0,
            resignUnlocked: false,
            principalWarning: false,
            memeSelfDeprecating: false,
            lichengConflictCount: 0
        },

        runStats: { total: 0, research: 0, enterprise: 0, financeLine: 0 },
        _prevTermEndAcademic: null,

        actionQueue: [],
        messages: [],
        clock: { hour: 9, minute: 0 },
        gameOver: false,
        currentEvent: null,
        currentEventResolved: false,
        executionMode: false,
        executionPhase: '',
        executionIndex: 0,
        pendingExecutionQueue: null,
        executionTimeline: null,
        executionStep: 0,
        executionLogs: [],
        executionRandomEvents: null,
        executionRandomEventIdx: 0,
        executionPendingPersonal: false,
        executionPendingEvent: null,
        titles: [],
        achievements: [],
        termEndShown: false,
        admissionStreak: 0,
        prevEval: 0,
        typingTimer: null,
        _execStatSnapshot: null,
        _activeTab: 'daily',  // 跟踪当前选中的行动Tab
        /** 开局年龄档（含 effect） */
        ageProfile: null,
        /** 三条背景词条：身世 / 风格 / 性格 各一条，见 BACKGROUND_POOL */
        backgroundTraits: []
    };
}

// ========== 数值操作 ==========
function v2UpdateStats() {
    v2.funds = clamp(v2.funds, -20, 100);
    v2.academicRep = clamp(v2.academicRep, 0, 100);
    v2.adminRep = clamp(v2.adminRep, 0, 100);
    v2.morale = clamp(v2.morale, 0, 100);
    v2.studentEval = clamp(v2.studentEval, 0, 100);
}

function v2ApplyEffect(effect) {
    if (!effect) return;
    for (const [k, v] of Object.entries(effect)) {
        if (k === 'reputation') {
            v2.academicRep = clamp(v2.academicRep + v, 0, 100);
        } else if (k in v2) {
            const nv = v2[k] + v;
            v2[k] = clamp(nv, -20, 100);
        }
    }
}

function v2CalcAvailableDays() {
    let base = 28;
    if (v2.flags.officeDecor && v2.flags.officeDecor.includes('coffee')) {
        base += 2;
    }
    return base;
}

function v2ApplyChoiceMeta(choice) {
    if (!choice) return;
    if (choice.petAdopt) {
        if (!Array.isArray(v2.flags.adoptedPets)) v2.flags.adoptedPets = [];
        if (!v2.flags.adoptedPets.includes(choice.petAdopt)) v2.flags.adoptedPets.push(choice.petAdopt);
    }
    if (choice.scandalFair) {
        v2.flags.scandalSuppressStage = 0;
    }
    if (choice.scandalSuppress) {
        v2.flags.scandalSuppressStage = (v2.flags.scandalSuppressStage || 0) + 1;
    }
    if (choice.memeSelfDeprecating) {
        v2.flags.memeSelfDeprecating = true;
    }
    if (choice.lichengConflict) {
        v2.flags.lichengConflictCount = (v2.flags.lichengConflictCount || 0) + 1;
    }
    if (choice.principalWarning) {
        v2.flags.principalWarning = true;
    }
    if (choice.resignUnlock) {
        v2.flags.resignUnlocked = true;
    }
    if (choice.staffLoyalty && choice.staffLoyalty.id) {
        const st = v2.staff && v2.staff.find((s) => s.id === choice.staffLoyalty.id);
        if (st) {
            st.loyalty = clamp(st.loyalty + (choice.staffLoyalty.delta || 0), 0, 100);
        }
    }
}

function v2BumpRunStats(task) {
    if (!task || !task.id) return;
    if (!v2.runStats) {
        v2.runStats = { total: 0, research: 0, enterprise: 0, financeLine: 0 };
    }
    v2.runStats.total += 1;
    if (task.id === 'research') v2.runStats.research += 1;
    if (task.id === 'enterprise') v2.runStats.enterprise += 1;
    if (task.id === 'finance') v2.runStats.financeLine += 1;
}

function v2HasIdealistTrait() {
    return (
        Array.isArray(v2.backgroundTraits) && v2.backgroundTraits.some((t) => t && t.tag === '理想主义者')
    );
}

function v2HasCatOrDogPet() {
    const p = v2.flags.adoptedPets || [];
    return p.includes('journal_cat') || p.includes('board_dog');
}

/** 办公室之神：猫+狗+陆龟，非数学/计算机系另需「光子」 */
function v2OfficeGodMet() {
    const p = v2.flags.adoptedPets || [];
    const has = (id) => p.includes(id);
    if (!has('journal_cat') || !has('board_dog') || !has('tortoise')) return false;
    const csMath = v2.deptType === 'cs' || v2.deptType === 'math';
    if (csMath) return true;
    return has('photon');
}

function v2TaoliConditionsMet() {
    return v2.studentEval >= 92 && v2.morale >= 82 && v2.academicRep >= 76;
}

function v2ResearchRatio() {
    const rs = v2.runStats || { total: 0, research: 0 };
    return rs.total > 0 ? rs.research / rs.total : 0;
}

function v2CorpActivityRatio() {
    const rs = v2.runStats || { total: 0, enterprise: 0, financeLine: 0 };
    if (rs.total <= 0) return 0;
    return ((rs.enterprise || 0) + (rs.financeLine || 0)) / rs.total;
}

// ========== 消息/邮件系统 ==========
/** 任职称谓：「××学院」→ 院长；「××系」→ 主任（避免出现「数学系院长」等不合惯例搭配） */
function v2FormatAssumeOfficeLine(deptName) {
    const n = (deptName || '').trim() || '本单位';
    if (n.includes('学院')) return `你已就任${n}院长`;
    if (n.includes('系')) return `你已就任${n}主任`;
    return `你已就任${n}负责人`;
}

const _traitStatZh = { academicRep: '学术', funds: '经费', studentEval: '学生', adminRep: '行政', morale: '士气' };
function v2FormatTraitEffectShort(effect) {
    if (!effect || !Object.keys(effect).length) return '数值均衡';
    return Object.entries(effect).map(([k, v]) => `${_traitStatZh[k] || k}${Number(v) >= 0 ? '+' : ''}${v}`).join('，');
}

function v2PushMail(text) {
    v2.messages.push({ text, turn: v2.totalMonth });
}

// ========== 存档 ==========
function v2GetSaveMeta(slot) {
    const raw = localStorage.getItem('dean_sim_save_' + slot);
    if (!raw) return null;
    try {
        const d = JSON.parse(raw);
        return {
            savedAt: d._savedAt,
            semester: d.semester,
            month: d.month,
            totalMonth: d.totalMonth,
            playerName: d.playerName,
            deptType: d.deptType
        };
    } catch (e) {
        return null;
    }
}

function v2FormatSaveSummary(meta) {
    if (!meta || meta.semester == null) return '（空）';
    const dept = DEPT_CONFIG[meta.deptType]?.name || '院系';
    const name = (meta.playerName || '').trim() || '未命名';
    const t = meta.savedAt
        ? new Date(meta.savedAt).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';
    return `第${meta.semester}学期 第${meta.month}月 · ${name} · ${dept}${t ? ' · ' + t : ''}`;
}

function v2SaveGame(slot, opts) {
    if (slot === undefined || slot === null || slot === '') slot = 'auto';
    const silent = opts && opts.silent;
    const fromMenu = opts && opts.fromMenu;
    const data = JSON.parse(JSON.stringify(v2));
    data._saveVersion = 2;
    data._savedAt = Date.now();
    const json = JSON.stringify(data);
    try {
        localStorage.setItem('dean_sim_save_' + slot, json);
        if (!silent && !fromMenu) {
            v2PushMail(`📁 已存档（槽位 ${slot}）`);
            v2RenderMessages();
            if (String(slot) !== 'auto') v2QueueSaveToast(`已写入手动存档 ${slot}`);
        }
        return true;
    } catch (e) {
        alert('存档失败：' + e.message);
        return false;
    }
}

/** 静默自动存档（执行回合结束等时机调用，不发邮件） */
function v2PersistAutoSave() {
    try {
        v2SaveGame('auto', { silent: true });
    } catch (e) { /* 存储满或隐私模式：静默跳过 */ }
}

function v2ApplyLoadedSave(data) {
    const defaults = JSON.parse(JSON.stringify(v2DefaultState()));
    Object.assign(v2, defaults);
    const snapshot = { ...data };
    delete snapshot._saveVersion;
    delete snapshot._savedAt;
    Object.assign(v2, snapshot);
    v2.flags = { ...v2DefaultState().flags, ...(data.flags && typeof data.flags === 'object' ? data.flags : {}) };
    const baseRel = JSON.parse(JSON.stringify(INITIAL_RELATION));
    v2.relations = { ...baseRel, ...(data.relations && typeof data.relations === 'object' ? data.relations : {}) };
    if (!Array.isArray(v2.staff)) v2.staff = [];
    if (!Array.isArray(v2.messages)) v2.messages = [];
    if (!Array.isArray(v2.actionQueue)) v2.actionQueue = [];
    if (!Array.isArray(v2.backgroundTraits)) v2.backgroundTraits = [];
    if (!('ageProfile' in data)) v2.ageProfile = null;
    v2.executionMode = false;
    v2.typingTimer = null;
    v2.pendingExecutionQueue = null;
    v2.executionTimeline = null;
    v2.executionStep = 0;
    v2.executionRandomEvents = null;
    v2.executionPendingEvent = null;
    v2.gameOver = false;
    delete v2._savedAt;
    delete v2._saveVersion;
}

function v2LoadGame(slot) {
    if (slot === undefined || slot === null || slot === '') slot = 'auto';
    const raw = localStorage.getItem('dean_sim_save_' + slot);
    if (!raw) return alert('该存档位为空。');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        alert('读档失败：存档数据损坏或格式无效。');
        return;
    }
    if (!data || typeof data !== 'object') {
        alert('读档失败：存档格式无效。');
        return;
    }
    try {
        v2ApplyLoadedSave(data);
        v2UpdateStats();
        v2PushMail('📂 读档完成');
        v2CheckAchievements();
        v2RenderPlaying();
    } catch (e) {
        alert('读档失败：状态恢复出错（可尝试新开一局）。');
        console.error(e);
    }
}

function v2HasSave(slot) {
    return !!localStorage.getItem('dean_sim_save_' + slot);
}

/** 是否有任一可读存档（自动存档优先于手动档位顺序） */
function v2GetContinueSlot() {
    if (v2HasSave('auto')) return 'auto';
    for (let i = 1; i <= 3; i++) {
        if (v2HasSave(i)) return i;
    }
    return null;
}

function v2MetaLoad() {
    try {
        const raw = localStorage.getItem('dean_sim_meta');
        if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { points: 0, ach: [], totalRuns: 0, bestScore: 0 };
}

function v2MetaSave(meta) {
    try { localStorage.setItem('dean_sim_meta', JSON.stringify(meta)); }
    catch (e) { /* ignore */ }
}

// ========== 开局向导 ==========
let _wizardStep = 0;
/** 向导内临时背景：年龄 + 身世/风格/性格各一条（分池互斥，杜绝双选矛盾词条） */
let _wizBackground = { age: null, family: null, style: null, personality: null };

function v2RenderSetup() {
    v2.gameOver = false;
    const app = document.getElementById('app');
    const step = _wizardStep;
    if (step === 0) {
        _wizBackground = { age: null, family: null, style: null, personality: null };
    }

    const steps = [
        // step 0: 开场
        () => {
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>🏫 院长模拟器</h2>
                <div class="story-box typing-active">你将扮演一名高校院系负责人。请先构筑<strong>年龄</strong>与<strong>三条背景词条</strong>（身世、风格、性格各选其一，逻辑互斥），再选择院系与培养方案。</div>
                <p style="color:#8fa8b8;font-size:0.82em;margin:12px 0;line-height:1.45;">词条分三组，每组只能选一条，不会出现「两种身世」等同池冲突。</p>
                <button class="btn" onclick="v2WizardAfterIntro()" style="margin-top:8px;">开始构筑 →</button>
            </div>`;
        },
        // step 1: 年龄档
        () => {
            const cards = BACKGROUND_POOL.age.map((a, i) =>
                `<div class="dept-option" onclick="v2WizardPickAge(${i})">
                    <span class="dept-name">${a.tag}（${a.value}岁）</span>
                    <span style="display:block;font-size:0.78em;color:#8fa8b8;">初始：${v2FormatTraitEffectShort(a.effect)}</span>
                </div>`
            ).join('');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>📅 年龄档</h2>
                <div style="margin:16px 0;">${cards}</div>
                <button type="button" class="btn secondary" onclick="v2WizardRollFromAgeStep()" style="margin-top:8px;">🎲 随机年龄并抽取三条词条（身世·风格·性格）</button>
                <div style="color:#7f9aab;font-size:0.78em;margin-top:8px;">三项词条将从对应词库各随机一条，彼此分池，无组合冲突。</div>
            </div>`;
        },
        // step 2: 身世词条（family）
        () => {
            const cards = BACKGROUND_POOL.family.map((t, i) =>
                `<div class="dept-option" onclick="v2WizardPickTrait('family',${i})">
                    <span class="dept-name">${t.tag}</span>
                    <span style="display:block;font-size:0.78em;color:#b0cec4;">${t.desc}</span>
                    <span style="display:block;font-size:0.76em;color:#8fa8b8;margin-top:4px;">${v2FormatTraitEffectShort(t.effect)}</span>
                </div>`
            ).join('');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>📖 身世词条</h2>
                <div style="margin:16px 0;">${cards}</div>
                <div style="color:#7f9aab;font-size:0.82em;">已选年龄：<strong>${_wizBackground.age ? _wizBackground.age.tag : ''}</strong></div>
            </div>`;
        },
        // step 3: 风格词条（style）
        () => {
            const cards = BACKGROUND_POOL.style.map((t, i) =>
                `<div class="dept-option" onclick="v2WizardPickTrait('style',${i})">
                    <span class="dept-name">${t.tag}</span>
                    <span style="display:block;font-size:0.78em;color:#b0cec4;">${t.desc}</span>
                    <span style="display:block;font-size:0.76em;color:#8fa8b8;margin-top:4px;">${v2FormatTraitEffectShort(t.effect)}</span>
                </div>`
            ).join('');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>🎨 风格词条</h2>
                <div style="margin:16px 0;">${cards}</div>
                <div style="color:#7f9aab;font-size:0.82em;">身世：<strong>${_wizBackground.family ? _wizBackground.family.tag : ''}</strong></div>
            </div>`;
        },
        // step 4: 性格词条（personality）
        () => {
            const cards = BACKGROUND_POOL.personality.map((t, i) =>
                `<div class="dept-option" onclick="v2WizardPickTrait('personality',${i})">
                    <span class="dept-name">${t.tag}</span>
                    <span style="display:block;font-size:0.78em;color:#b0cec4;">${t.desc}</span>
                    <span style="display:block;font-size:0.76em;color:#8fa8b8;margin-top:4px;">${v2FormatTraitEffectShort(t.effect)}</span>
                </div>`
            ).join('');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>🎭 性格词条</h2>
                <div style="margin:16px 0;">${cards}</div>
                <div style="color:#7f9aab;font-size:0.82em;">身世 ${(_wizBackground.family && _wizBackground.family.tag) || '—'} · 风格 <strong>${_wizBackground.style ? _wizBackground.style.tag : ''}</strong></div>
            </div>`;
        },
        // step 5: 选择院系
        () => {
            const deptOptions = Object.entries(DEPT_CONFIG).map(([k, v]) =>
                `<div class="dept-option" onclick="v2SelectDept('${k}')">
                    <span class="dept-icon">${v.icon}</span>
                    <span class="dept-name">${v.name}</span>
                    <span class="dept-init">${Object.entries(v.init||{}).map(([kk, vv]) => `${{'academicRep':'学术','funds':'经费','studentEval':'学生','adminRep':'行政','morale':'士气'}[kk]||kk}${vv>=0?'+':''}${vv}`).join(', ')}</span>
                </div>`
            ).join('');
            const bgRecap = [
                _wizBackground.age && `年龄：${_wizBackground.age.tag}`,
                _wizBackground.family && `身世：${_wizBackground.family.tag}`,
                _wizBackground.style && `风格：${_wizBackground.style.tag}`,
                _wizBackground.personality && `性格：${_wizBackground.personality.tag}`
            ].filter(Boolean).join(' · ');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>🏫 选择你的院系</h2>
                <div style="color:#8fa8b8;font-size:0.84em;margin-bottom:12px;line-height:1.4;">${bgRecap || '（背景未完整，请从第一步重新构筑）'}</div>
                <div style="margin:16px 0;">${deptOptions}</div>
                <div style="color:#7f9aab;font-size:0.82em;">不同的院系有截然不同的初始资源和挑战。</div>
            </div>`;
        },
        // step 6: 培养方案
        () => {
            const curStatZh = { academicRep: '学术', funds: '经费', studentEval: '学生', adminRep: '行政', morale: '士气' };
            const curOptions = Object.entries(CURRICULUM_PASSIVE).map(([k, v]) => {
                const sub = Object.entries(v)
                    .filter(([kk]) => kk !== 'name')
                    .map(([kk, vv]) => {
                        const label = curStatZh[kk] || kk;
                        const n = Number(vv);
                        const sign = n >= 0 ? '+' : '';
                        return `${label}每月${sign}${n}`;
                    })
                    .join('，');
                return `<div class="dept-option" onclick="v2SelectCurriculum('${k}')">
                    <span class="dept-name">${v.name || k}</span>
                    <span style="display:block;font-size:0.78em;color:#8fa8b8;">${sub}</span>
                </div>`;
            }).join('');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>📚 培养方案</h2>
                <div style="margin:16px 0;">${curOptions}</div>
                <div style="color:#7f9aab;font-size:0.82em;">每学期结算时提供被动数值加成。</div>
            </div>`;
        },
        // step 7: 难度选择
        () => {
            const diffOptions = Object.entries(DIFFICULTY_PRESETS).map(([k, v]) =>
                `<div class="dept-option" onclick="v2SelectDifficulty('${k}')">
                    <span class="dept-name">${v.name}</span>
                </div>`
            ).join('');
            app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
                <h2>⚙️ 选择难度</h2>
                <div style="margin:16px 0;">${diffOptions}</div>
            </div>`;
        },
        // step 8: 姓名
        () => {
            app.innerHTML = `<div class="page-transition-in" style="max-width:480px;margin:auto;">
                <h2>✍️ 输入你的名字</h2>
                <div style="margin:20px 0;">
                    <input id="v2NameInput" class="game-input" placeholder="输入姓名" maxlength="10" style="width:100%;box-sizing:border-box;padding:10px;">
                </div>
                <button class="btn" onclick="v2ConfirmName()">确认 →</button>
            </div>`;
            setTimeout(() => document.getElementById('v2NameInput')?.focus(), 100);
        }
    ];

    // 向导步进回调在文件末尾挂到 window，保证与首屏「开始」一样在首包加载后始终可用

    // 按步骤执行
    if (steps[step]) steps[step]();
    else v2InitGame();
}

// ========== 游戏初始化 ==========
function v2InitGame() {
    const defaults = v2DefaultState();
    // 保留用户选择
    const playerName = v2.playerName;
    const deptType = v2.deptType;
    const curriculum = v2.curriculum;
    const difficulty = v2.difficulty;
    const ageProfile = v2.ageProfile;
    const backgroundTraits = v2.backgroundTraits;

    Object.assign(v2, JSON.parse(JSON.stringify(defaults)));
    v2.playerName = playerName;
    v2.deptType = deptType;
    v2.curriculum = curriculum;
    v2.difficulty = difficulty;
    v2.ageProfile = ageProfile ? JSON.parse(JSON.stringify(ageProfile)) : null;
    v2.backgroundTraits = Array.isArray(backgroundTraits)
        ? JSON.parse(JSON.stringify(backgroundTraits))
        : [];

    // 应用院系修正
    const dept = DEPT_CONFIG[deptType];
    if (dept && dept.init) v2ApplyEffect(dept.init);

    // 应用难度修正
    const diff = DIFFICULTY_PRESETS[difficulty];
    if (diff && diff.init) v2ApplyEffect(diff.init);

    // 年龄档与三条背景词条（分池各一条，数值叠加无叙事冲突）
    if (v2.ageProfile && v2.ageProfile.effect) v2ApplyEffect(v2.ageProfile.effect);
    (v2.backgroundTraits || []).forEach(tr => {
        if (tr && tr.effect) v2ApplyEffect(tr.effect);
    });

    // 初始关系
    v2.relations = JSON.parse(JSON.stringify(INITIAL_RELATION));

    // 生成下属
    v2.staff = STAFF_TEMPLATES.map(t => {
        const pool = STAFF_PERSONA_POOL[t.id] || [];
        const persona = v2Pick(pool) || {};
        return {
            id: t.id,
            title: t.title,
            name: persona.name || '未命名',
            trait: persona.trait || '普通',
            ability: persona.ability ?? v2RandomInRange(persona.abilityRange) ?? (30 + Math.floor(Math.random() * 40)),
            loyalty: persona.loyalty ?? v2RandomInRange(persona.loyaltyRange) ?? (20 + Math.floor(Math.random() * 30)),
            profile: persona.profile || '一位下属。',
            quest: persona.quest || null,
            flaw: persona.flaw || null
        };
    });

    // 初始消息
    const deptName = DEPT_CONFIG[deptType]?.name || '未知院系';
    v2PushMail(`📋 欢迎到任！${v2FormatAssumeOfficeLine(deptName)}。`);
    const bgTags = [v2.ageProfile?.tag, ...(v2.backgroundTraits || []).map(t => t?.tag)].filter(Boolean);
    if (bgTags.length) v2PushMail(`📜 背景构筑：${bgTags.join(' · ')}`);
    v2PushMail('📌 提示：每月至少排1项日常+1项重点方可执行月度。');

    v2.availableDays = v2CalcAvailableDays();
    v2UpdateStats();
    v2RenderPlaying();
    v2PersistAutoSave();
}

// ========== 主游戏渲染 ==========
function v2RenderPlaying() {
    const app = document.getElementById('app');
    const dept = DEPT_CONFIG[v2.deptType] || {};
    const queueDays = v2.actionQueue.reduce((s, t) => s + t.days, 0);
    const remaining = v2.availableDays - v2.usedDays - queueDays;
    const canExec = v2.actionQueue.filter(t => t.type === 'daily').length >= 1 &&
                    v2.actionQueue.filter(t => t.type === 'focus').length >= 1 && !v2.currentEvent;
    const bgHeaderTags = [v2.ageProfile?.tag, ...(v2.backgroundTraits || []).map(t => t?.tag)].filter(Boolean);
    const bgHeaderHtml = bgHeaderTags.length
        ? `<span style="display:block;color:#7f9aab;font-size:0.74em;margin-top:4px;">${bgHeaderTags.join(' · ')}</span>`
        : '';

    app.innerHTML = `<div class="play-container page-transition-in">
        <div class="play-header">
            <div><span style="font-size:1.1em;">${dept.icon || ''} ${dept.name || ''} · ${v2.playerName}</span>
            <span style="color:#8fa8b8;font-size:0.78em;margin-left:8px;">第${v2.semester}学期 第${v2.month}月</span>
            <span style="color:#7f9aab;font-size:0.78em;margin-left:6px;">(总月${v2.totalMonth})</span>
            ${bgHeaderHtml}</div>
            <div style="display:flex;gap:6px;">
                <button class="btn" onclick="v2ShowMenu()" style="width:auto;margin:0;font-size:0.78em;">☰ 菜单</button>
                <button class="btn" onclick="v2ShowAchievements()" style="width:auto;margin:0;font-size:0.78em;">🏆 成就</button>
            </div>
        </div>
        <div class="play-stats" id="v2PlayStats">
            <div class="stat-item"><span class="stat-name">💰经费</span><span class="stat-val" id="v2StatFunds">${v2.funds}</span></div>
            <div class="stat-item"><span class="stat-name">📚学术</span><span class="stat-val" id="v2StatAcademic">${v2.academicRep}</span></div>
            <div class="stat-item"><span class="stat-name">🏛️行政</span><span class="stat-val" id="v2StatAdmin">${v2.adminRep}</span></div>
            <div class="stat-item"><span class="stat-name">😊士气</span><span class="stat-val" id="v2StatMorale">${v2.morale}</span></div>
            <div class="stat-item"><span class="stat-name">🎓学生</span><span class="stat-val" id="v2StatStudent">${v2.studentEval}</span></div>
        </div>
        <div class="play-info-bar">
            <span>⏳ 本月可用 <strong>${remaining}</strong> 天 | 已排程 <strong>${queueDays}</strong> 天 | 精力 <strong>${v2.energy}</strong>%</span>
        </div>
        <div class="play-body">
            <div id="v2ActionArea">
                <div id="v2ActionTabs"></div>
                <div id="v2ActionTabContent"></div>
            </div>
            <div class="message-board" id="v2MessageBoard"></div>
            <div class="staff-panel" id="v2StaffPanel">
                <div style="color:#7f9aab;font-size:0.82em;">点击展开「核心管理层」</div>
            </div>
        </div>
    </div>`;

    // 进度条
    const progressPercent = remaining <= 0 ? 100 : Math.round((queueDays / (queueDays + remaining)) * 100);
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `height:3px;background:#1e2b3c;margin:2px 10px;border-radius:2px;`;
    progressBar.innerHTML = `<div style="width:${Math.min(progressPercent, 100)}%;height:100%;background:linear-gradient(90deg,#4a9eff,#6bc9ff);border-radius:2px;transition:width 0.3s;"></div>`;
    document.querySelector('.play-info-bar')?.after(progressBar);

    v2RenderQueue();
    v2RenderActionTabs();
    v2RenderStaffPanel();
    v2RenderMessages();
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
        <button class="btn ${v2._activeTab === 'daily' ? 'tab-active' : ''}" onclick="v2ShowActionTab('daily')">📋 日常事务</button>
        <button class="btn ${v2._activeTab === 'focus' ? 'tab-active' : ''}" onclick="v2ShowActionTab('focus')">🎯 重点项目</button>
        <button class="btn ${v2._activeTab === 'staff' ? 'tab-active' : ''}" onclick="v2ShowActionTab('staff')">👥 下属互动</button>
    </div>
    <div id="v2ActionTabContent"></div>
    <div class="hint-line">💡 每月需要至少排1项日常+1项重点。</div>
    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center;">
        <button class="btn" id="v2ExecBtn" onclick="v2ExecuteMonth()" ${v2.actionQueue.filter(t=>t.type==='daily').length===0||v2.actionQueue.filter(t=>t.type==='focus').length===0?'disabled':''}>▶ 执行本月排程</button>
        <button class="btn warning" onclick="v2EndTerm()" style="text-align:center;">⏭ 跳过剩余天数结束本月</button>
    </div>
    ${
        v2.semester >= 6 &&
        v2.semester <= 8 &&
        v2.totalMonth < 24 &&
        (v2.flags.resignUnlocked || (v2.flags.lichengConflictCount || 0) >= 3)
            ? `<div style="margin-top:8px;"><button type="button" class="btn secondary" onclick="v2OfferResign()">👔 申请辞职（急流勇退）</button>
        <span style="color:#7f9aab;font-size:0.78em;margin-left:8px;">第6–8学期且已解锁（约谈或与李立诚冲突满三次）</span></div>`
            : ''
    }`;

    tabContainer.innerHTML = html;
    v2ShowActionTab(v2._activeTab);
}

function v2ShowActionTab(tab) {
    v2._activeTab = tab;
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
    // 只更新排程队列而不是全量 re-render，防止闪烁
    const area = document.getElementById('v2ActionArea');
    if (area) {
        // 重新渲染排程队列（保留 Tab）
        v2RenderQueueOnly(area);
    } else {
        v2RenderPlaying();
    }
}

// 排程队列增量更新（直接更新 innerHTML，消除 DOM 替换导致的闪烁和 Tab 跳回）
function v2RenderQueueOnly(area) {
    const queueEl = area.querySelector('.schedule-queue');
    if (queueEl) {
        let content = '';
        if (v2.actionQueue.length === 0) {
            content = `<div class="queue-empty">暂无排程。选择下面的行动后自动加入。</div>`;
        } else {
            v2.actionQueue.forEach((t, i) => {
                const label = t.type === 'daily' ? '📋' : t.type === 'focus' ? '🎯' : '⚡';
                content += `<div class="queue-item"><span>${label} ${t.title}</span>
                    <span style="display:flex;gap:6px;"><span style="color:#8fa8b8;">${t.days}天</span>
                    <span style="color:#e74c3c;cursor:pointer;" onclick="v2RemoveQueueItem(${i})">✕</span></span></div>`;
            });
        }
        queueEl.innerHTML = content;
    }

    // 更新执行按钮状态
    const execBtn = document.getElementById('v2ExecBtn');
    if (execBtn) {
        const hasDaily = v2.actionQueue.filter(t => t.type === 'daily').length >= 1;
        const hasFocus = v2.actionQueue.filter(t => t.type === 'focus').length >= 1;
        execBtn.disabled = !(hasDaily && hasFocus && !v2.currentEvent);
    }

    // 更新信息栏的排程天数
    const infoBar = document.querySelector('.play-info-bar');
    if (infoBar) {
        const queueDays = v2.actionQueue.reduce((s, t) => s + t.days, 0);
        const remaining = v2.availableDays - v2.usedDays - queueDays;
        infoBar.innerHTML = `<span>⏳ 本月可用 <strong>${remaining}</strong> 天 | 已排程 <strong>${queueDays}</strong> 天 | 精力 <strong>${v2.energy}</strong>%</span>`;
    }
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
    v2CheckAchievements();
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
let v2ExecAutoTimer = null;
/** 执行页底部「继续」对应逻辑（由 #v2ExecActions 委托点击触发，避免 onclick 与布局挤压失效） */
let v2ExecNextClick = null;
/** 执行页「跳过打字」对应逻辑 */
let v2ExecSkipClick = null;

function v2ExecActionsDelegated(ev) {
    const raw = ev.target;
    const el = raw && raw.nodeType === Node.ELEMENT_NODE ? raw : raw?.parentElement;
    if (!el || typeof el.closest !== 'function') return;
    const btn = el.closest('button');
    if (!btn || !ev.currentTarget.contains(btn)) return;
    if (btn.id === 'v2ExecNextBtn') {
        ev.preventDefault();
        if (typeof v2ExecNextClick === 'function') v2ExecNextClick();
    } else if (btn.id === 'v2ExecSkipText') {
        ev.preventDefault();
        if (typeof v2ExecSkipClick === 'function') v2ExecSkipClick();
    }
}

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
        const petOk = PET_EVENTS.filter((ev) => !ev.requireDept || (ev.requireDept && ev.requireDept.includes(v2.deptType)));
        const allRandomEvents = [...GENERIC_RANDOM_EVENTS, ...REAL_UNIVERSITY_EVENTS, ...petOk, ...ENDING_HOOK_EVENTS];
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
    if (v2.typingTimer) { clearTimeout(v2.typingTimer); v2.typingTimer = null; }
    if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    v2ExecNextClick = null;
    v2ExecSkipClick = null;

    const appV2 = document.getElementById('app');
    const dept = DEPT_CONFIG[v2.deptType] || DEPT_CONFIG.cs;

    // 修复黑屏：移除过渡动画，强制重置 opacity/transform 避免动画 fill 残留
    appV2.classList.remove('page-transition-out');
    appV2.style.opacity = '1';
    appV2.style.transform = 'none';

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
            <button type="button" class="btn skip" id="v2ExecSkipText" style="display:none">⏩ 跳过打字</button>
            <button type="button" class="btn" id="v2ExecNextBtn" style="display:none">继续 →</button>
            <span class="exec-auto-label" style="display:none" id="v2ExecAutoLabel">即将自动继续…</span>
        </div>
    </div>`;

    document.getElementById('v2ExecActions')?.addEventListener('click', v2ExecActionsDelegated);

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
    if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }

    // 仅在主时间线已开始推进后插入突发（executionStep>0 表示至少已展示过时间线第 1 步），避免一点「执行」尚未进入计划叙事就先弹突发
    if (v2.executionStep > 0 && v2.executionRandomEvents && v2.executionRandomEvents.length > 0 && Math.random() < 0.15) {
        const ev = v2.executionRandomEvents.shift();
        if (ev) return v2ExecShowIndependentEvent(ev);
    }

    if (v2.executionStep >= v2.executionTimeline.length) {
        return v2ExecFinish();
    }

    const step = v2.executionTimeline[v2.executionStep];
    const stagePane = document.getElementById('v2ExecStagePane');
    const nextBtn = document.getElementById('v2ExecNextBtn');
    const skipBtn = document.getElementById('v2ExecSkipText');
    // 勿检查 #v2ExecNarr：首段旁白后会清空 stagePane，该节点已从 DOM 移除，否则第二次点「继续」会在此静默 return
    if (!stagePane || !nextBtn) return;

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
                    if (nextBtn && nextBtn.style.display !== 'none' && v2ExecNextClick) v2ExecNextClick();
                }, 3000);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        if (skipBtn) skipBtn.style.display = 'inline-block';
        v2ExecNextClick = () => { if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
    } else if (step.type === 'comment') {
        stagePane.classList.add('highlight-comment');
        stagePane.innerHTML = `<h3>💬 校园声音</h3><div class="exec-narr exec-typewriter-cursor" id="v2ExecCommentActive"></div>`;
        const activeEl = document.getElementById('v2ExecCommentActive');
        if (activeEl) {
            v2Typewriter(step.text, 'v2ExecCommentActive', 'v2ExecSkipText', () => {
                if (nextBtn) nextBtn.style.display = 'inline-block';
                v2ExecAutoTimer = setTimeout(() => { if (nextBtn && v2ExecNextClick) v2ExecNextClick(); }, 2500);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        if (skipBtn) skipBtn.style.display = 'inline-block';
        v2ExecNextClick = () => { if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
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
                v2ExecAutoTimer = setTimeout(() => { if (nextBtn && v2ExecNextClick) v2ExecNextClick(); }, 2500);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }

        v2ExecNextClick = () => { if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
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
                v2ExecAutoTimer = setTimeout(() => { if (nextBtn && v2ExecNextClick) v2ExecNextClick(); }, 2500);
                if (autoLabel) autoLabel.style.display = 'block';
            });
        }
        if (skipBtn) skipBtn.style.display = 'inline-block';
        v2ExecNextClick = () => { if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; } v2ExecNextStep(); };
    }
}

function v2ExecShowIndependentEvent(ev) {
    const nextBtn = document.getElementById('v2ExecNextBtn');
    if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    const autoLabel = document.getElementById('v2ExecAutoLabel');
    if (autoLabel) autoLabel.style.display = 'none';

    const popup = document.createElement('div');
    popup.className = 'exec-event-popup';
    popup.id = 'v2ExecEventPopup';
    popup.innerHTML = `<div class="exec-event-panel slide-up-in">
        <h3>⚡ 突发事件：${ev.title}</h3>
        <div class="event-text">${ev.text}</div>
        <div class="event-choices">
            ${ev.choices.map((c, i) => `<button type="button" class="btn" data-choice="${i}">${c.text}</button>`).join('')}
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
            v2ApplyChoiceMeta(choice);
            v2UpdateStats();
            v2ExecRefreshStatValues(oldStats);

            popup.remove();
            const autoLabelAfter = document.getElementById('v2ExecAutoLabel');
            if (autoLabelAfter) autoLabelAfter.style.display = 'block';
            if (nextBtn) nextBtn.style.display = 'inline-block';

            let proceededAfterEvent = false;
            const proceedAfterIndependentEvent = () => {
                if (proceededAfterEvent) return;
                proceededAfterEvent = true;
                if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }
                if (autoLabelAfter) autoLabelAfter.style.display = 'none';
                v2ExecNextClick = null;
                v2ExecNextStep();
            };
            v2ExecNextClick = proceedAfterIndependentEvent;
            v2ExecAutoTimer = setTimeout(proceedAfterIndependentEvent, 750);
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
    if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    v2ExecNextClick = null;
    v2ExecSkipClick = null;
    const fundsBefore = v2.funds;
    const queueSnap = v2.pendingExecutionQueue;
    if (fundsBefore < 10 && queueSnap && queueSnap.some((t) => t.type === 'focus')) {
        v2TryUnlockAchievementById('low_fund_meeting');
    }
    const passive = CURRICULUM_PASSIVE[v2.curriculum] || CURRICULUM_PASSIVE.balanced;
    v2ApplyEffect(passive);
    v2UnlockTitles();
    const prevEvalForStreak = v2.prevEval ?? v2.studentEval;
    if (v2.studentEval > prevEvalForStreak) v2.admissionStreak += 1;
    else v2.admissionStreak = 0;
    v2.prevEval = v2.studentEval;
    v2.carryoverDays = Math.max(0, v2.usedDays - v2.availableDays);

    // 进度到下个月（须先更新 semester，成就如「初出茅庐」才能在对的时机判定）
    v2.totalMonth += 1;
    v2.month = (v2.totalMonth % 3) + 1;
    v2.flags.termPersonalStoryUsed = false;

    const newTerm = Math.floor(v2.totalMonth / 3) + 1;
    if (newTerm > v2.semester) {
        v2.semester = newTerm;
    }

    if (v2.totalMonth > 0 && v2.totalMonth % 3 === 0) {
        const curA = v2.academicRep;
        if (v2._prevTermEndAcademic != null) {
            const drop = v2._prevTermEndAcademic - curA;
            if (drop > 10) {
                v2.flags.academicDropStreak = (v2.flags.academicDropStreak || 0) + 1;
            } else {
                v2.flags.academicDropStreak = 0;
            }
        }
        v2._prevTermEndAcademic = curA;
    }

    v2CheckAchievements();
    v2UpdateStats();

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
    v2.currentEvent = null;
    v2.currentEventResolved = false;
    v2.termEndShown = false;

    v2PersistAutoSave();
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
    if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }
    v2ExecNextClick = null;
    v2ExecSkipClick = null;
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
    v2ApplyEffect(scaleTaskEffectGains(task.effect));
    v2BumpRunStats(task);
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
    const feedback = v2Pick(pool);

    return feedback;
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

    if (v2.totalMonth > 0 && v2.totalMonth % 3 === 0) {
        const curA = v2.academicRep;
        if (v2._prevTermEndAcademic != null) {
            const drop = v2._prevTermEndAcademic - curA;
            if (drop > 10) {
                v2.flags.academicDropStreak = (v2.flags.academicDropStreak || 0) + 1;
            } else {
                v2.flags.academicDropStreak = 0;
            }
        }
        v2._prevTermEndAcademic = curA;
    }

    v2CheckAchievements();

    v2.flags.termPersonalStoryUsed = false;
    v2.energy = 100;
    v2.usedDays = 0;
    v2.actionQueue = [];
    v2.availableDays = v2CalcAvailableDays();
    v2.currentEvent = null;
    v2.currentEventResolved = false;

    v2PersistAutoSave();
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
    // 丑闻下台（压制举报链 / 学术声望连续下滑）
    if ((v2.flags.scandalSuppressStage || 0) >= 2 || (v2.flags.academicDropStreak || 0) >= 2) {
        return v2EndWithMessage(
            '📰 丑闻下台\n\n调查组进驻学院，翻出了陈年旧账。你因为处理失当成为众矢之的，黯然辞职。校报标题：《院长涉嫌包庇，学术净土蒙尘》。\n\n赵敏将你的离职证明默默归档。',
            'gameover'
        );
    }
    // 被下属推翻
    if (v2.staff && v2.staff.some((s) => (s.loyalty ?? 100) <= 0) && v2.morale <= 25) {
        return v2EndWithMessage(
            '🔪 被下属推翻\n\n那天早晨，你桌上摆着全体教师的联名信。为首的正是那位曾对你寄予厚望的下属。他冷冷地说：「主任，是你先辜负了大家。」\n\n你收拾好私人物品。陆龟「评估」爬过你脚边，仿佛在道别。',
            'gameover'
        );
    }
    // 理想破灭（理想主义者 · 第 4 学期末：累计满 12 个月时判定一次）
    if (
        v2.totalMonth === 12 &&
        v2HasIdealistTrait() &&
        (v2.studentEval < 50 || v2.morale < 40)
    ) {
        return v2EndWithMessage(
            '💔 理想破灭\n\n你曾发誓要重塑大学精神，但无情的现实将理想碾得粉碎。学生在匿名信中骂你「嘴炮」，老教师摇头叹息。你终于写下辞职信，在办公室独自坐到深夜。\n\n窗外，你上任时种下的那盆绿植早已枯死。',
            'gameover'
        );
    }

    if (v2.totalMonth < 24) {
        // 学术巨擘（优先于高升等声望类）
        if (v2.academicRep >= 100 && v2ResearchRatio() > 0.6 && v2.funds >= 60) {
            return v2EndWithMessage(
                '🔬 学术巨擘\n\n你以惊人效率发表了一系列高水平成果，甚至吸引了国际学术组织的注意。最终，你辞去行政职务，全职回归科研。\n\n李立诚在退休聚餐上说：「你终于做回了自己。」',
                'ending'
            );
        }
        // 企业明星
        if (v2.funds >= 95 && v2.academicRep <= 40 && v2CorpActivityRatio() > 0.3) {
            return v2EndWithMessage(
                '💼 企业明星\n\n你深谙资本运作，学院账面上富得流油，但学术氛围荡然无存。一家上市企业向你抛出橄榄枝，年薪翻倍。\n\n你离开那天，李立诚没有来送别。学生论坛上有人留言：「院长变成了 CEO。」',
                'ending'
            );
        }
        // 高升
        if (v2.academicRep >= 94 && v2.funds >= 84) {
            return v2EndWithMessage(
                '🚀 高升结局\n\n你的学术声誉和经费管理能力引起了校领导的注意。在一次闭门会议后，周校长亲自打电话：「上面有一个副校长的位置，我和书记都推荐了你。」\n\n这当然不是终点，但至少证明——你做对了什么。',
                'ending'
            );
        }
        // 桃李满天下
        if (v2TaoliConditionsMet()) {
            return v2EndWithMessage(
                '🌸 桃李满天下\n\n校友会年度报告上，你的名字被反复提及。学生评价调查中，「推荐院长」的比例达到了历史最高。\n\n一位刚毕业的学生在朋友圈里写道：「如果大学有形状，那大概就是我们院长的样子。」\n\n你看到这条动态时，默默截了图。',
                'ending'
            );
        }
        // 网红院长（不与桃李同时；需梗事件或猫狗宠物）
        if (
            !v2TaoliConditionsMet() &&
            v2.studentEval >= 95 &&
            v2.academicRep <= 50 &&
            (v2.flags.memeSelfDeprecating || v2HasCatOrDogPet())
        ) {
            return v2EndWithMessage(
                '🤳 网红院长\n\n你因亲民形象走红网络，被学生称为「表情包院长」。虽然学术上未建奇功，但你的社交账号粉丝破了十万，甚至受邀参加校园综艺。\n\n学校犹豫再三，决定把你当成招生宣传的一张名片。',
                'ending'
            );
        }
    }

    // 任期满 8 学期 = 24 个月：终身院长 / 平庸过渡 / 默认总结 + 办公室之神彩蛋
    if (v2.totalMonth >= 24) {
        const f = v2.funds;
        const a = v2.academicRep;
        const m = v2.morale;
        const s = v2.studentEval;
        const band = (x) => x >= 40 && x <= 60;
        const fourOk = f >= 65 && a >= 65 && m >= 65 && s >= 65;
        const mediocreCount = [f, a, m, s].filter(band).length;
        const egg = v2OfficeGodMet()
            ? '\n\n🐾 【彩蛋·办公室之神】你的办公室成了校园奇景：橘猫与校犬、陆龟与实验室里的小家伙各自占山为王。毕业典礼上，学生代表说：「我们院长教会我们的，是温柔。」'
            : '';

        if (fourOk) {
            return v2EndWithMessage(
                `🏅 终身院长\n\n你以稳健的手腕赢得了所有人的尊重。校党委全票通过你的连任，并授予「荣誉院长」称号。今后，系里的走廊会挂上你的照片，新生入学第一课就是听你的故事。${egg}`,
                'ending'
            );
        }
        if (mediocreCount >= 3) {
            return v2EndWithMessage(
                `🍂 平庸过渡\n\n四年任期平淡收场。学校认为你「无功无过」，将你调任至校图书馆担任馆长。你收拾办公室时，窗台上只剩那只陆龟趴着不动。赵敏替你把纸箱搬上了车。${egg}`,
                'ending'
            );
        }
        const summary = v2BuildEndSummary();
        return v2EndWithMessage(`🎉 任期结束\n\n你完成了 8 个学期的院长任期。\n\n${summary}${egg}`, 'ending');
    }
    return false;
}

function v2OfferResign() {
    if (v2.gameOver || v2.executionMode) return;
    const can =
        v2.semester >= 6 &&
        v2.semester <= 8 &&
        v2.totalMonth < 24 &&
        (v2.flags.resignUnlocked || (v2.flags.lichengConflictCount || 0) >= 3);
    if (!can) {
        alert('当前不满足辞职条件（需第6–8学期，且经校领导约谈解锁，或与李立诚冲突累计满三次）。');
        return;
    }
    if (!confirm('确定要辞职吗？将立即进入「急流勇退」结局。')) return;
    v2EndWithMessage(
        '👔 急流勇退\n\n你放下印章，回到教师队伍。虽然不再是院长，但讲台和实验室依旧欢迎你。多年后，年轻教师还会说：「那位主动让贤的老主任，是真懂学问的人。」',
        'ending'
    );
}

function v2EndWithMessage(msg, type) {
    v2.gameOver = true;
    v2.executionMode = false;
    if (v2ExecAutoTimer) { clearTimeout(v2ExecAutoTimer); v2ExecAutoTimer = null; }

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
        <button class="btn" onclick="v2RestartNewGame()" style="text-align:center;">🔄 再来一次</button>
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
    if (v2.typingTimer) { clearTimeout(v2.typingTimer); }

    el.textContent = '';
    const speed = 28;

    function typeChar() {
        if (idx < text.length) {
            el.textContent += text[idx];
            idx++;
            v2.typingTimer = setTimeout(typeChar, speed);
        } else {
            v2.typingTimer = null;
            v2ExecSkipClick = null;
            if (onComplete) onComplete();
        }
    }

    const skipBtn = document.getElementById(skipBtnId);
    if (skipBtn) {
        v2ExecSkipClick = () => {
            if (v2.typingTimer) { clearTimeout(v2.typingTimer); v2.typingTimer = null; }
            el.textContent = text;
            v2ExecSkipClick = null;
            if (onComplete) onComplete();
        };
        skipBtn.style.display = 'inline-block';
    }

    typeChar();
}

// ========== 菜单 ==========
function v2ShowMenu() {
    const app = document.getElementById('app');
    const autoMeta = v2GetSaveMeta('auto');
    const autoSum = v2FormatSaveSummary(autoMeta);
    const manualBlocks = [1, 2, 3].map((i) => {
        const m = v2GetSaveMeta(i);
        const sum = v2FormatSaveSummary(m);
        return `<div style="background:#141c24;border:2px solid #3d5166;border-radius:2px;padding:10px;margin-bottom:10px;">
            <div style="color:#b0cec4;font-size:0.8em;margin-bottom:8px;line-height:1.4;"><strong style="color:#f5cd79;">手动槽 ${i}</strong><br>${sum}</div>
            <button type="button" class="btn" onclick="v2SaveManualFromMenu(${i})" style="text-align:center;width:100%;margin-bottom:4px;">💾 保存到槽 ${i}</button>
            <button type="button" class="btn secondary" onclick="v2LoadGame(${i})" style="text-align:center;width:100%;"${m ? '' : ' disabled'}>📂 读取槽 ${i}</button>
        </div>`;
    }).join('');
    app.innerHTML = `<div class="page-transition-in" style="max-width:520px;margin:auto;">
        <h2>☰ 菜单</h2>
        <div style="margin:16px 0;">
            <div style="color:#f5cd79;font-size:0.9em;margin-bottom:6px;">⚡ 自动存档（1）</div>
            <div style="font-size:0.78em;color:#b0cec4;margin-bottom:8px;line-height:1.45;">${autoSum}</div>
            <div style="font-size:0.72em;color:#7f9aab;margin-bottom:8px;line-height:1.4;">每月结算、新开局、跳过本月时自动写入；与下方手动槽互不覆盖。</div>
            <button type="button" class="btn secondary" onclick="v2LoadGame('auto')" style="text-align:center;width:100%;margin-bottom:14px;"${autoMeta ? '' : ' disabled'}>📂 读取自动存档</button>

            <div style="color:#f5cd79;font-size:0.9em;margin-bottom:6px;">💾 手动存档（3）</div>
            ${manualBlocks}

            <button type="button" class="btn warning" onclick="v2RenderPlaying()" style="text-align:center;margin-top:8px;">◀ 返回游戏</button>
            <button type="button" class="btn warning" onclick="if(confirm('确定重新开始？'))v2RestartNewGame()" style="text-align:center;">🔄 重新开始</button>
        </div>
    </div>`;
}

// ========== 成就查看 ==========
function v2ShowAchievements() {
    const meta = v2MetaLoad();
    const app = document.getElementById('app');
    let html = `<div class="page-transition-in" style="max-width:500px;margin:auto;">
        <h2>🏆 成就</h2>
        <div style="margin:12px 0;color:#8fa8b8;font-size:0.88em;">周目点数：${meta.points || 0} | 最高分：${meta.bestScore || 0} | 总运行次数：${meta.totalRuns || 0}</div>`;
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

// ========== 称号 ==========
function v2UnlockTitles() {
    TITLE_RULES.forEach(rule => {
        if (!v2.titles.includes(rule.id) && rule.cond(v2)) {
            v2.titles.push(rule.id);
            v2PushMail(`🏅 获得称号：${rule.name}`);
        }
    });
}

/** 按 id 解锁一条成就（用于无通用 cond 的特殊判定，如逆风推进） */
function v2TryUnlockAchievementById(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return false;
    const meta = v2MetaLoad();
    meta.ach = meta.ach || [];
    if (meta.ach.includes(id)) return false;
    meta.ach.push(id);
    meta.points = (meta.points || 0) + a.points;
    v2MetaSave(meta);
    v2PushMail(`🏆 成就解锁：${a.name}（+${a.points}点）`);
    v2QueueAchievementToast(a.name, a.points, a.desc);
    if (document.getElementById('v2MessageBoard')) v2RenderMessages();
    return true;
}

function v2CheckAchievements() {
    const meta = v2MetaLoad();
    meta.ach = meta.ach || [];
    const toGrant = [];
    ACHIEVEMENTS.forEach((a) => {
        if (!a.cond) return;
        if (meta.ach.includes(a.id)) return;
        let ok = false;
        try {
            ok = !!a.cond(v2, meta);
        } catch (e) {
            console.warn('achievement cond', a.id, e);
        }
        if (ok) toGrant.push(a);
    });
    toGrant.forEach((a) => {
        meta.ach.push(a.id);
        meta.points = (meta.points || 0) + a.points;
    });
    if (toGrant.length) {
        v2MetaSave(meta);
        toGrant.forEach((a, i) => {
            v2PushMail(`🏆 成就解锁：${a.name}（+${a.points}点）`);
            setTimeout(() => v2QueueAchievementToast(a.name, a.points, a.desc), i * 420);
        });
        if (document.getElementById('v2MessageBoard')) v2RenderMessages();
    }
}

function v2EnsureToastHost() {
    let host = document.getElementById('v2ToastHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'v2ToastHost';
        host.setAttribute('aria-live', 'polite');
        document.body.insertBefore(host, document.body.firstChild);
    }
    return host;
}

/** 成就解锁屏幕提示（左上角叠放，与邮件并行） */
function v2QueueAchievementToast(name, points, desc) {
    const host = v2EnsureToastHost();
    const el = document.createElement('div');
    el.className = 'v2-ach-toast';
    el.setAttribute('role', 'status');
    const safe = (s) => {
        const t = document.createElement('span');
        t.textContent = s == null ? '' : String(s);
        return t.innerHTML;
    };
    el.innerHTML = `<span class="v2-ach-toast-badge">🏆 成就解锁</span>
<strong class="v2-ach-toast-name">${safe(name)}</strong>
<span class="v2-ach-toast-pts">+${Number(points) || 0} 周目点数</span>
${desc ? `<span class="v2-ach-toast-desc">${safe(desc)}</span>` : ''}`;
    host.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('show'));
    });
    const hideMs = 4200;
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 280);
    }, hideMs);
}

/** 存档成功简短提示（菜单保存、非静默手动存） */
function v2QueueSaveToast(message) {
    const host = v2EnsureToastHost();
    const el = document.createElement('div');
    el.className = 'v2-save-toast';
    el.setAttribute('role', 'status');
    const span = document.createElement('span');
    span.textContent = message;
    el.appendChild(span);
    host.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 280);
    }, 2600);
}

// ========== 暴露全局接口 ==========
// ES 模块内联 onclick 只能调用 window 上的函数；向导步进/选项须在此注册，避免仅在某次 v2RenderSetup 内赋值导致偶发未定义
window.v2WizardAfterIntro = () => { _wizardStep = 1; v2RenderSetup(); };
window.v2WizardPickAge = (i) => {
    const a = BACKGROUND_POOL.age[i];
    if (!a) return;
    _wizBackground.age = { ...a };
    _wizardStep = 2;
    v2RenderSetup();
};
window.v2WizardPickTrait = (poolKey, idx) => {
    const pool = BACKGROUND_POOL[poolKey];
    if (!pool || pool[idx] === undefined) return;
    _wizBackground[poolKey] = { ...pool[idx] };
    if (poolKey === 'family') _wizardStep = 3;
    else if (poolKey === 'style') _wizardStep = 4;
    else if (poolKey === 'personality') _wizardStep = 5;
    v2RenderSetup();
};
window.v2WizardRollFromAgeStep = () => {
    _wizBackground.age = { ...v2Pick(BACKGROUND_POOL.age) };
    _wizBackground.family = { ...v2Pick(BACKGROUND_POOL.family) };
    _wizBackground.style = { ...v2Pick(BACKGROUND_POOL.style) };
    _wizBackground.personality = { ...v2Pick(BACKGROUND_POOL.personality) };
    _wizardStep = 5;
    v2RenderSetup();
};
window.v2SelectDept = (dept) => { v2.deptType = dept; _wizardStep = 6; v2RenderSetup(); };
window.v2SelectCurriculum = (cur) => { v2.curriculum = cur; _wizardStep = 7; v2RenderSetup(); };
window.v2SelectDifficulty = (diff) => { v2.difficulty = diff; _wizardStep = 8; v2RenderSetup(); };
window.v2ConfirmName = () => {
    const name = (document.getElementById('v2NameInput')?.value || '').trim();
    if (!name) return alert('请输入名字');
    if (!_wizBackground.age || !_wizBackground.family || !_wizBackground.style || !_wizBackground.personality) {
        return alert('背景构筑不完整，请从「开始构筑」重新选择年龄与三条词条。');
    }
    v2.playerName = name;
    v2.ageProfile = JSON.parse(JSON.stringify(_wizBackground.age));
    v2.backgroundTraits = [
        _wizBackground.family,
        _wizBackground.style,
        _wizBackground.personality
    ].map(t => JSON.parse(JSON.stringify(t)));
    _wizardStep = 0;
    v2InitGame();
};
window.v2RestartNewGame = () => { _wizardStep = 0; v2RenderSetup(); };
window.v2RenderSetup = v2RenderSetup;
window.v2RenderPlaying = v2RenderPlaying;
window.v2ToggleStaff = v2ToggleStaff;
window.v2ShowMenu = v2ShowMenu;
window.v2ShowAchievements = v2ShowAchievements;
window.v2ShowActionTab = v2ShowActionTab;
window.v2AddAction = v2AddAction;
window.v2RemoveQueueItem = v2RemoveQueueItem;
window.v2ExecuteMonth = v2ExecuteMonth;
window.v2AbortExecution = v2AbortExecution;
window.v2EndTerm = v2EndTerm;
window.v2OfferResign = v2OfferResign;
window.v2ContinueGame = v2ContinueGame;
window.v2StaffTalk = v2StaffTalk;
window.v2SaveGame = v2SaveGame;
window.v2LoadGame = v2LoadGame;
window.v2HasSave = v2HasSave;
window.v2LoadContinue = () => {
    const slot = v2GetContinueSlot();
    if (slot != null) v2LoadGame(slot);
};
window.v2SaveManualFromMenu = (i) => {
    if (v2SaveGame(i, { fromMenu: true })) {
        v2QueueSaveToast(`手动槽 ${i} 已保存`);
        v2ShowMenu();
    }
};
window.v2InitGame = v2InitGame;
window.v2Typewriter = v2Typewriter;

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', () => {
    const continueSlot = v2GetContinueSlot();
    const app = document.getElementById('app');
    if (continueSlot != null) {
        const slotHint = continueSlot === 'auto' ? '自动存档' : `存档槽 ${continueSlot}`;
        app.innerHTML = `<div class="page-transition-in" style="max-width:500px;margin:auto;text-align:center;">
            <h2>🏫 院长模拟器</h2>
            <div style="margin:20px 0;color:#8fa8b8;font-size:0.88em;">检测到本地 ${slotHint}</div>
            <button class="btn" onclick="v2LoadContinue()" style="text-align:center;margin-bottom:6px;">📂 继续游戏</button>
            <button class="btn warning" onclick="v2RestartNewGame()" style="text-align:center;">🔄 重新开始</button>
        </div>`;
    } else {
        v2RenderSetup();
    }
});