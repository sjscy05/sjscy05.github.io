/**
 * 游玩周期蒙特卡洛模拟：每月叠培养被动；不含突发/主事件线。
 *
 * 策略：
 *   random / greedy — 每月仅 1 日常 + 1 重点（旧模型，偏低估成长）。
 *   fill / fill-greedy — 按游戏 28 天预算尽量排满队列（与正式玩法更接近），
 *     先满足≥1日常+1重点且天数不超，再在剩余天数内反复加入可行行动直至塞不下。
 *
 * 用法（在 Dean_simulator 目录）：
 *   npm run balance
 *   npm run balance:fill
 *   node scripts/balance-sim.mjs --runs 3000 --strategy fill --month-days 28
 *   node scripts/balance-sim.mjs --tune
 *
 * 调节结局阈值：改下方 DEFAULT_ENDINGS，或与 game.js 中 v2CheckEndings 保持同步。
 */

import { createEventData } from '../assets/js/events.js';
import { DEPT_CONFIG, CURRICULUM_PASSIVE, DIFFICULTY_PRESETS, scaleTaskEffectGains } from '../assets/js/config.js';

// —— 与 game.js v2CheckEndings 保持同步（调平衡时改两处）——
const DEFAULT_ENDINGS = {
    gameOverFunds: -10,
    gameOverMorale: 0,
    tenureTotalMonth: 24,
    gaosheng: { academicRep: 94, funds: 84 },
    taoli: { studentEval: 92, morale: 82, academicRep: 76 }
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

/** 在所有「日常+重点」组合中选分数和最高且总天数≤monthDays 的一对（用于 fill-greedy 起手） */
function pickGreedyPair(dailyActions, focusProjects, monthDays) {
    let bestD = dailyActions[0];
    let bestF = focusProjects[0];
    let bestSum = -Infinity;
    for (const d of dailyActions) {
        for (const f of focusProjects) {
            if (d.days + f.days > monthDays) continue;
            const sc = scoreAction(d.effect) + scoreAction(f.effect);
            if (sc > bestSum) {
                bestSum = sc;
                bestD = d;
                bestF = f;
            }
        }
    }
    return { daily: bestD, focus: bestF };
}

function pickRandomValidPair(dailyActions, focusProjects, monthDays, rng) {
    for (let k = 0; k < 400; k++) {
        const d = pick(dailyActions, rng);
        const f = pick(focusProjects, rng);
        if (d.days + f.days <= monthDays) return { d, f };
    }
    for (const d of dailyActions) {
        for (const f of focusProjects) {
            if (d.days + f.days <= monthDays) return { d, f };
        }
    }
    throw new Error('balance-sim: 没有能在当月排下的日常+重点组合（请检查 month-days）');
}

/**
 * @param {'random'|'greedy'} fillMode random=剩余天数内随机挑可行项；greedy=每次选 score 最高的可行项
 */
function packMonthFill(dailyActions, focusProjects, rng, monthDays, fillMode) {
    const { d, f } =
        fillMode === 'greedy'
            ? (() => {
                  const p = pickGreedyPair(dailyActions, focusProjects, monthDays);
                  return { d: p.daily, f: p.focus };
              })()
            : pickRandomValidPair(dailyActions, focusProjects, monthDays, rng);

    const queue = [
        { effect: d.effect, days: d.days },
        { effect: f.effect, days: f.days }
    ];
    let remaining = monthDays - d.days - f.days;

    const pool = () => [
        ...dailyActions.map((a) => ({ effect: a.effect, days: a.days })),
        ...focusProjects.map((a) => ({ effect: a.effect, days: a.days }))
    ];

    const minDay = Math.min(
        ...dailyActions.map((a) => a.days),
        ...focusProjects.map((a) => a.days)
    );

    while (remaining >= minDay) {
        const fit = pool().filter((a) => a.days <= remaining);
        if (fit.length === 0) break;
        let next;
        if (fillMode === 'greedy') {
            next = fit.reduce((best, a) => (scoreAction(a.effect) > scoreAction(best.effect) ? a : best));
        } else {
            next = pick(fit, rng);
        }
        queue.push(next);
        remaining -= next.days;
    }
    return queue;
}

function runOneSimulation(rng, deptKey, curriculumKey, difficultyKey, rules, strategy, maxMonths = 120, monthDays = 28) {
    const state = initialState(deptKey, curriculumKey, difficultyKey);
    const { dailyActions, focusProjects } = createEventData();
    const passive = CURRICULUM_PASSIVE[curriculumKey] || CURRICULUM_PASSIVE.balanced;
    const flatPassive = Object.fromEntries(
        Object.entries(passive).filter(([k]) => k !== 'name')
    );

    for (let step = 0; step < maxMonths; step++) {
        if (strategy === 'fill' || strategy === 'fill-greedy') {
            const fillMode = strategy === 'fill-greedy' ? 'greedy' : 'random';
            const queue = packMonthFill(dailyActions, focusProjects, rng, monthDays, fillMode);
            for (const t of queue) {
                applyEffect(state, scaleTaskEffectGains(t.effect));
            }
        } else {
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
            applyEffect(state, scaleTaskEffectGains(daily.effect));
            applyEffect(state, scaleTaskEffectGains(focus.effect));
        }
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
        strategy: 'random',
        monthDays: 28
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
        else if (a[i] === '--month-days') out.monthDays = parseInt(a[++i], 10);
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
    console.log(
        `院系=${args.dept} 培养=${args.curriculum} 难度=${args.difficulty} 策略=${args.strategy} 月天数=${args.monthDays} 回合=${args.runs} seed=${args.seed}`
    );
    const md = args.monthDays;
    const desc =
        args.strategy === 'greedy'
            ? '规则：每月「贪心」选 1 日常+1 重点，再叠培养被动；不含事件。用于旧模型下最短通关下界。'
            : args.strategy === 'fill'
              ? `规则：每月按「${md}天」预算尽量排满日常/重点（随机起手+随机塞满），逐项结算效果后再叠培养被动；不含下属/突发。`
              : args.strategy === 'fill-greedy'
                ? `规则：每月 ${md} 天内贪心排满（起手与加塞均取加权分最高），再叠培养被动；若常年期满则说明加权分与高升/桃李多维门槛不对齐，请以 fill（随机填满）为主力参考。`
                : '规则：每月仅随机 1 日常 + 1 重点，再叠培养被动（旧简化模型，不含 28 天排满）。';
    console.log(desc);
    console.log('');

    const results = [];
    const byType = Object.create(null);

    for (let i = 0; i < args.runs; i++) {
        const r = runOneSimulation(rng, args.dept, args.curriculum, args.difficulty, rules, args.strategy, 120, args.monthDays);
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
        console.log(`\n✓ 中位月数 ${p50} 落在目标区间 [${args.targetLo}, ${args.targetHi}]（粗粒度，当前策略=${args.strategy}）。`);
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
                    monthsArr.push(
                        runOneSimulation(rng2, args.dept, args.curriculum, args.difficulty, trial, args.strategy, 120, args.monthDays).months
                    );
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
