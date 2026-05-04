/**
 * 游玩周期蒙特卡洛模拟：随机抽取「1 日常 + 1 重点」行动 + 培养方案月度被动，
 * 不计入突发/主事件线，用于观察结局解锁大致需要多少「月」。
 *
 * 用法（在 Dean_simulator 目录）：
 *   npm run balance
 *   node scripts/balance-sim.mjs --runs 3000 --dept cs --curriculum balanced
 *   node scripts/balance-sim.mjs --tune        # 粗扫阈值，使中位月数落在目标区间
 *
 * 调节结局阈值：改下方 ENDING_RULES，或与 game.js 中 v2CheckEndings 保持同步。
 */

import { createEventData } from '../assets/js/events.js';
import { DEPT_CONFIG, CURRICULUM_PASSIVE, DIFFICULTY_PRESETS } from '../assets/js/config.js';

// —— 与 game.js v2CheckEndings 保持同步（调平衡时改两处）——
const DEFAULT_ENDINGS = {
    gameOverFunds: -10,
    gameOverMorale: 0,
    tenureTotalMonth: 24,
    gaosheng: { academicRep: 90, funds: 78 },
    taoli: { studentEval: 88, morale: 78, academicRep: 72 }
};

function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

function applyEffect(state, effect) {
    if (!effect) return;
    for (const [k, val] of Object.entries(effect)) {
        if (k === 'reputation') {
            state.academicRep = clamp(state.academicRep + val, 0, 100);
        } else if (Object.prototype.hasOwnProperty.call(state, k)) {
            const lo = k === 'funds' ? -20 : 0;
            state[k] = clamp(state[k] + val, lo, 100);
        }
    }
}

function initialState(deptKey, curriculumKey, difficultyKey) {
    const s = {
        funds: 30,
        academicRep: 30,
        adminRep: 30,
        morale: 30,
        studentEval: 30,
        semester: 1,
        month: 1,
        totalMonth: 0
    };
    const dept = DEPT_CONFIG[deptKey];
    if (dept && dept.init) applyEffect(s, dept.init);
    const diff = DIFFICULTY_PRESETS[difficultyKey];
    if (diff && diff.init) applyEffect(s, diff.init);
    return s;
}

function advanceMonth(state) {
    state.totalMonth += 1;
    state.month = (state.totalMonth % 3) + 1;
    const newTerm = Math.floor(state.totalMonth / 3) + 1;
    if (newTerm > state.semester) state.semester = newTerm;
}

function checkEnding(state, rules) {
    if (state.funds <= rules.gameOverFunds) return { type: 'gameover_funds', label: '财务崩盘' };
    if (state.morale <= rules.gameOverMorale) return { type: 'gameover_morale', label: '士气归零' };
    if (state.totalMonth >= rules.tenureTotalMonth) return { type: 'tenure', label: '任期期满(24月)' };
    const g = rules.gaosheng;
    if (state.academicRep >= g.academicRep && state.funds >= g.funds) return { type: 'gaosheng', label: '高升结局' };
    const t = rules.taoli;
    if (state.studentEval >= t.studentEval && state.morale >= t.morale && state.academicRep >= t.academicRep) {
        return { type: 'taoli', label: '桃李满天下' };
    }
    return null;
}

function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}

/** 估算单次行动的「强度」用于贪心（偏推高数值结局速度） */
function scoreAction(effect) {
    if (!effect) return 0;
    const e = effect;
    return (
        (e.academicRep || 0) * 1.2 +
        (e.studentEval || 0) * 1.1 +
        (e.funds || 0) * 0.35 +
        (e.morale || 0) * 0.8 +
        (e.adminRep || 0) * 0.5
    );
}

function pickGreedy(dailyActions, focusProjects) {
    let bestD = dailyActions[0];
    let bestScore = -Infinity;
    for (const d of dailyActions) {
        const sc = scoreAction(d.effect);
        if (sc > bestScore) {
            bestScore = sc;
            bestD = d;
        }
    }
    let bestF = focusProjects[0];
    bestScore = -Infinity;
    for (const f of focusProjects) {
        const sc = scoreAction(f.effect);
        if (sc > bestScore) {
            bestScore = sc;
            bestF = f;
        }
    }
    return { daily: bestD, focus: bestF };
}

function runOneSimulation(rng, deptKey, curriculumKey, difficultyKey, rules, strategy, maxMonths = 120) {
    const state = initialState(deptKey, curriculumKey, difficultyKey);
    const { dailyActions, focusProjects } = createEventData();
    const passive = CURRICULUM_PASSIVE[curriculumKey] || CURRICULUM_PASSIVE.balanced;
    const flatPassive = Object.fromEntries(
        Object.entries(passive).filter(([k]) => k !== 'name')
    );

    for (let step = 0; step < maxMonths; step++) {
        let daily;
        let focus;
        if (strategy === 'greedy') {
            const g = pickGreedy(dailyActions, focusProjects);
            daily = g.daily;
            focus = g.focus;
        } else {
            daily = pick(dailyActions, rng);
            focus = pick(focusProjects, rng);
        }
        applyEffect(state, daily.effect);
        applyEffect(state, focus.effect);
        applyEffect(state, flatPassive);
        advanceMonth(state);
        const end = checkEnding(state, rules);
        if (end) return { months: state.totalMonth, ending: end, final: { ...state } };
    }
    return { months: maxMonths, ending: { type: 'timeout', label: '未触发结局(上限)' }, final: { ...state } };
}

function percentile(sorted, p) {
    if (sorted.length === 0) return NaN;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return sorted[idx];
}

function parseArgs() {
    const a = process.argv.slice(2);
    const out = {
        runs: 2500,
        dept: 'cs',
        curriculum: 'balanced',
        difficulty: 'normal',
        tune: false,
        seed: Date.now() % 1e9,
        targetLo: 10,
        targetHi: 22,
        strategy: 'random'
    };
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '--runs') out.runs = parseInt(a[++i], 10);
        else if (a[i] === '--dept') out.dept = a[++i];
        else if (a[i] === '--curriculum') out.curriculum = a[++i];
        else if (a[i] === '--difficulty') out.difficulty = a[++i];
        else if (a[i] === '--tune') out.tune = true;
        else if (a[i] === '--seed') out.seed = parseInt(a[++i], 10);
        else if (a[i] === '--target-lo') out.targetLo = parseFloat(a[++i]);
        else if (a[i] === '--target-hi') out.targetHi = parseFloat(a[++i]);
        else if (a[i] === '--strategy') out.strategy = a[++i];
    }
    return out;
}

function makeRng(seed) {
    let x = seed >>> 0;
    return function () {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return ((x >>> 0) % 1e9) / 1e9;
    };
}

function histogram(counts, bucketSize = 2) {
    const h = new Map();
    for (const m of counts) {
        const b = Math.floor((m - 1) / bucketSize) * bucketSize + 1;
        const key = `${b}-${b + bucketSize - 1}月`;
        h.set(key, (h.get(key) || 0) + 1);
    }
    return [...h.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
}

function main() {
    const args = parseArgs();
    const rng = makeRng(args.seed);
    let rules = { ...DEFAULT_ENDINGS };

    console.log('=== 院长模拟器 · 游玩周期模拟 ===\n');
    console.log(`院系=${args.dept} 培养=${args.curriculum} 难度=${args.difficulty} 策略=${args.strategy} 回合=${args.runs} seed=${args.seed}`);
    console.log(
        args.strategy === 'greedy'
            ? '规则：每月「贪心」选日常+重点（偏推高数值），再叠培养被动；不含事件。用于估计最短通关月数下界。'
            : '规则：每月随机 1 项日常 + 1 项重点，再叠当月培养被动（与游戏结算顺序一致）；不含事件/突发。'
    );
    console.log('');

    const results = [];
    const byType = Object.create(null);

    for (let i = 0; i < args.runs; i++) {
        const r = runOneSimulation(rng, args.dept, args.curriculum, args.difficulty, rules, args.strategy);
        results.push(r.months);
        const k = r.ending.type;
        byType[k] = (byType[k] || 0) + 1;
    }

    const sorted = [...results].sort((a, b) => a - b);
    const mean = results.reduce((s, x) => s + x, 0) / results.length;

    console.log('— 首次触发的结局分布 —');
    for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k}: ${v} (${((v / args.runs) * 100).toFixed(1)}%)`);
    }
    console.log('\n— 距首次结局的月数（越少越早「通关」）—');
    console.log(`  min / max: ${sorted[0]} / ${sorted[sorted.length - 1]}`);
    console.log(`  mean: ${mean.toFixed(2)}`);
    console.log(`  p50 / p90: ${percentile(sorted, 0.5)} / ${percentile(sorted, 0.9)}`);

    console.log('\n— 月数直方图（约 2 月一档）—');
    for (const [label, c] of histogram(results)) {
        const bar = '#'.repeat(Math.round((c / args.runs) * 40));
        console.log(`  ${label.padEnd(14)} ${(c / args.runs * 100).toFixed(1)}% ${bar}`);
    }

    console.log('\n— 当前结局阈值（高升 / 桃李）—');
    console.log(`  高升: 学术≥${rules.gaosheng.academicRep} 且 经费≥${rules.gaosheng.funds}`);
    console.log(`  桃李: 学生≥${rules.taoli.studentEval} 且 士气≥${rules.taoli.morale} 且 学术≥${rules.taoli.academicRep}`);

    const p50 = percentile(sorted, 0.5);
    if (p50 < args.targetLo) {
        console.log(`\n⚠ 中位月数 ${p50} < 目标下限 ${args.targetLo}：多数局过早进入结局，建议提高结局阈值或降低月度被动（见 CURRICULUM_PASSIVE）。`);
    } else if (p50 > args.targetHi) {
        console.log(`\n⚠ 中位月数 ${p50} > 目标上限 ${args.targetHi}：可考虑略降阈值或加强正向日常池。`);
    } else {
        console.log(`\n✓ 中位月数 ${p50} 落在目标区间 [${args.targetLo}, ${args.targetHi}]（粗粒度，仅随机行动模型）。`);
    }

    if (args.tune) {
        console.log('\n=== 粗调扫描（仅调整高升学术阈值 + 桃李学生阈值，其它不变）===\n');
        let best = null;
        for (let addGaosheng = 0; addGaosheng <= 15; addGaosheng += 1) {
            for (let addTaoli = 0; addTaoli <= 12; addTaoli += 2) {
                const trial = {
                    ...DEFAULT_ENDINGS,
                    gaosheng: {
                        academicRep: DEFAULT_ENDINGS.gaosheng.academicRep + addGaosheng,
                        funds: DEFAULT_ENDINGS.gaosheng.funds + Math.floor(addGaosheng / 3)
                    },
                    taoli: {
                        studentEval: DEFAULT_ENDINGS.taoli.studentEval + addTaoli,
                        morale: DEFAULT_ENDINGS.taoli.morale + Math.floor(addTaoli / 4),
                        academicRep: DEFAULT_ENDINGS.taoli.academicRep + Math.floor(addTaoli / 3)
                    }
                };
                const rng2 = makeRng(args.seed + addGaosheng * 100 + addTaoli);
                const monthsArr = [];
                for (let i = 0; i < Math.min(800, args.runs); i++) {
                    monthsArr.push(runOneSimulation(rng2, args.dept, args.curriculum, args.difficulty, trial, args.strategy).months);
                }
                monthsArr.sort((a, b) => a - b);
                const m50 = percentile(monthsArr, 0.5);
                const mMean = monthsArr.reduce((s, x) => s + x, 0) / monthsArr.length;
                const dist = Math.max(Math.abs(m50 - (args.targetLo + args.targetHi) / 2), Math.abs(mMean - (args.targetLo + args.targetHi) / 2));
                if (!best || dist < best.dist) {
                    best = { dist, trial, m50, mMean, addGaosheng, addTaoli };
                }
            }
        }
        if (best) {
            console.log(`推荐偏移（启发式）: 高升学术 +${best.addGaosheng}, 桃李相关 +${best.addTaoli}（子样本 800 局）`);
            console.log(`  → 样本 p50≈${best.m50}月 mean≈${best.mMean.toFixed(1)}月`);
            console.log('  建议同步到 game.js v2CheckEndings:', JSON.stringify(best.trial.gaosheng), JSON.stringify(best.trial.taoli));
        }
    }
}

main();
