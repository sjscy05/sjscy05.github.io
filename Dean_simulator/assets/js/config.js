export const INITIAL_RELATION = {
    principal: { name: '周校长', role: '校领导', favor: 56, desc: '关注学校排名和治理风险。' },
    family: { name: '家人', role: '家庭', favor: 60, desc: '希望你别把工作焦虑带回家。' },
    peer: { name: '郭教授', role: '兄弟院系', favor: 50, desc: '合作与竞争并存。' },
    studentRep: { name: '何雨晴', role: '学生代表', favor: 58, desc: '高度关注教学体验。' },
    alumniGuild: { name: '校友会', role: '外部资源', favor: 48, desc: '影响捐赠和社会口碑。' },
    enterprise: { name: '合作企业', role: '产学接口', favor: 50, desc: '影响横向课题和就业。' }
};

export const BACKGROUND_POOL = {
    age: [
        { tag: '青年少壮', value: 38, range: 5, effect: { academicRep: -1, adminRep: 1 } },
        { tag: '年富力强', value: 44, range: 6, effect: { academicRep: 1, morale: 1 } },
        { tag: '资深稳健', value: 50, range: 6, effect: { academicRep: 3, adminRep: 2 } }
    ],
    gender: [{ tag: '男', effect: {} }, { tag: '女', effect: {} }],
    family: [
        { tag: '学术明星', desc: '你曾是本系最年轻的教授，论文引用量名列全校前茅。', special: '科研相关活动收益更高；李立诚初始更易认可你。', effect: { academicRep: 10, funds: 5 } },
        { tag: '空降官僚', desc: '你从校机关直接调任，缺乏基层教学经验，教师们对你充满怀疑。', special: '初期教师信任偏低，但行政推进起手更快。', effect: { morale: -8, funds: 12 } },
        { tag: '工科转行', desc: '你原本在工业界带研发团队，被母校请回执掌院系。', special: '企业合作与设备采购线更容易打通。', effect: { funds: 15, academicRep: -5 } },
        { tag: '海归精英', desc: '你在海外名校任教多年，带着国际视野回归。', special: '对外活动更顺，但老教师偶有“水土不服”评价。', effect: { academicRep: 8, studentEval: 5 } },
        { tag: '校友系嫡', desc: '你本硕博都在本系，是根正苗红的“自己人”。', special: '校庆与校友事件更易获得支持。', effect: { morale: 8, adminRep: 3 } },
        { tag: '前任影子', desc: '你接替的是德高望重的老院长，所有人都把你拿来比较。', special: '评价里常出现“如果是老院长……”的压力。', effect: { academicRep: -3, adminRep: -3, morale: -3, studentEval: -3 } }
    ],
    style: [
        { tag: '教学名师', desc: '你曾获国家级教学成果奖，学生称你“最会讲课的老师”。', special: '教学改革推进更顺，但学术端会盯你科研产出。', effect: { studentEval: 10, funds: -5 } },
        { tag: '传承派', desc: '你坚信基础学科不能变味，拒绝对教学内容大动刀。', special: '传统课程更稳，但教学改革选项更受限制。', effect: { studentEval: -5, morale: 6 } },
        { tag: '资源猎手', desc: '你有人脉、会拉项目，也最懂经费从哪来。', special: '拉赞助和捐赠线触发率更高。', effect: { funds: 20, academicRep: -3 } },
        { tag: '青年教师之友', desc: '你常帮年轻教师改基金本子、顶评审压力。', special: '青年教师相关危机更容易稳住。', effect: { morale: 10, academicRep: 2 } },
        { tag: '信息达人', desc: '你擅长收集校内情报，几乎每个系统都有你的消息源。', special: '更容易提前拿到风险信号。', effect: { adminRep: 6, studentEval: 2 } },
        { tag: '理想主义者', desc: '你带着“重塑大学精神”的愿景上任。', special: '前期热情高，但兑现压力也更大。', effect: { studentEval: 15, funds: -10, morale: 5 } }
    ],
    personality: [
        { tag: '和事佬', desc: '你以温和谦逊著称，擅长化解矛盾，人缘极佳。', special: '冲突类事件有额外安抚效果，但决断速度偏慢。', effect: { morale: 12 } },
        { tag: '雷厉风行', desc: '你作风强硬，说到做到，人称“推土机主任”。', special: '可走强硬手段线，见效快但容易引起抵触。', effect: { adminRep: 6, morale: -6 } },
        { tag: '救火队长', desc: '你常在危机中受命，专治各种烂摊子。', special: '突发事件更容易止损，但长期压力更高。', effect: { adminRep: 8, morale: -5 } }
    ]
};

export const STAFF_TEMPLATES = [
    { id: 'teach_director', title: '教学委员会主任' },
    { id: 'acad_director', title: '学术委员会主任' },
    { id: 'admin_director', title: '教务办主任' },
    { id: 'lab_director', title: '实验室主任' }
];

export const STAFF_PERSONA_POOL = {
    teach_director: [
        {
            name: '王明远',
            trait: '稳妥协调派',
            profile: '擅长平衡教师关系和教学执行。',
            abilityRange: [58, 75],
            loyaltyRange: [60, 86],
            quest: { title: '教学观摩周', desc: '举办跨院观摩周。', effect: { studentEval: 4, morale: 2 }, loyaltyGain: 10 },
            flaw: '连续高压会过劳病休'
        },
        {
            name: '沈清禾',
            trait: '细节完美主义',
            profile: '慢但稳，重细节。',
            abilityRange: [62, 78],
            loyaltyRange: [52, 80],
            quest: { title: '课程质量复盘', desc: '建立课程复盘机制。', effect: { studentEval: 5 }, loyaltyGain: 9 },
            flaw: '临时改计划会掉忠诚'
        }
    ],
    acad_director: [
        {
            name: '李立诚',
            trait: '孤傲突破派',
            profile: '学术强，不愿长期杂务化。',
            abilityRange: [74, 92],
            loyaltyRange: [35, 62],
            quest: { title: '专著出版计划', desc: '推进学术专著出版。', effect: { academicRep: 6 }, loyaltyGain: 10 },
            flaw: '长期杂务可能辞职'
        },
        {
            name: '顾思远',
            trait: '目标导向学者',
            profile: '冲项目快，容错低。',
            abilityRange: [70, 88],
            loyaltyRange: [40, 68],
            quest: { title: '冲击人才项目', desc: '集中资源申报杰青。', effect: { academicRep: 7, funds: -2 }, loyaltyGain: 9 },
            flaw: '短期目标压力大'
        }
    ],
    admin_director: [
        {
            name: '赵敏',
            trait: '流程推进派',
            profile: '抗压强，推动快。',
            abilityRange: [60, 84],
            loyaltyRange: [55, 82],
            quest: { title: '教务系统升级', desc: '推动教务流程数字化。', effect: { adminRep: 4, funds: 2 }, loyaltyGain: 8 },
            flaw: '长期背锅会积怨'
        },
        {
            name: '宋子涵',
            trait: '制度设计派',
            profile: '擅长搭制度。',
            abilityRange: [58, 80],
            loyaltyRange: [50, 78],
            quest: { title: '绩效规则重构', desc: '重构绩效分配规则。', effect: { morale: 3, adminRep: 3 }, loyaltyGain: 8 },
            flaw: '改革期争议大'
        }
    ],
    lab_director: [
        {
            name: '陈刚',
            trait: '硬核实干派',
            profile: '设备和安全统筹强。',
            abilityRange: [66, 88],
            loyaltyRange: [48, 74],
            quest: { title: '重点实验室扩容', desc: '争取扩容预算。', effect: { academicRep: 4, funds: -2 }, loyaltyGain: 8 },
            flaw: '事故压力高'
        },
        {
            name: '唐雪莹',
            trait: '平台建设派',
            profile: '擅长共享平台。',
            abilityRange: [64, 86],
            loyaltyRange: [50, 76],
            quest: { title: '共享仪器平台', desc: '建设跨课题共享。', effect: { studentEval: 2, academicRep: 3 }, loyaltyGain: 7 },
            flaw: '前期成本高'
        }
    ]
};

export const DEPT_CONFIG = {
    math: { name: '数学系', icon: '📐', init: { academicRep: 6, funds: -6 } },
    physics: { name: '物理系', icon: '🔭', init: { academicRep: 2, adminRep: 1 } },
    cs: { name: '计算机系', icon: '💻', init: { funds: 10, studentEval: 3, academicRep: -2 } },
    literature: { name: '文学院', icon: '📚', init: { morale: 6, studentEval: 4 } },
    economics: { name: '经管学院', icon: '💹', init: { funds: 8, adminRep: 3, morale: -1 } },
    biomed: { name: '生医学院', icon: '🧬', init: { academicRep: 5, funds: -10 } }
};

export const CURRICULUM_PASSIVE = {
    theoretical: { name: '理论扎实型', academicRep: 2 },
    applied: { name: '应用技能型', studentEval: 2 },
    balanced: { name: '均衡培养', academicRep: 1, studentEval: 1 },
    research: { name: '科研驱动型', academicRep: 3, funds: -1 },
    industry: { name: '产学对接型', funds: 2, studentEval: 2, adminRep: 1 },
    global: { name: '国际视野型', academicRep: 1, studentEval: 2, adminRep: 1 }
};

export const OFFICE_DECOR = [
    { id: 'coffee', name: '咖啡机', cost: 10, time: 2, effect: { monthDays: 2 }, desc: '每月可用天数 +2。' },
    { id: 'scroll', name: '题字字画', cost: 8, time: 1, effect: { morale: 2 }, desc: '教师士气波动更稳。' },
    { id: 'meeting', name: '小型会客区', cost: 14, time: 3, effect: { adminRep: 3, relation: { enterprise: 3 } }, desc: '外部会谈成功率提升。' }
];

export const TITLE_RULES = [
    { id: 'reform', name: '改革先锋', cond: (g) => g.flags.reforms >= 6 },
    { id: 'funding', name: '拉赞助能手', cond: (g) => g.funds >= 90 },
    { id: 'beloved', name: '最受爱戴院长', cond: (g) => g.studentEval >= 88 && g.morale >= 80 }
];

export const ACHIEVEMENTS = [
    /** 条件在 v2ExecFinish 内单独判定（需月初经费与队列快照），此处不设 cond */
    { id: 'low_fund_meeting', name: '逆风推进', desc: '月初经费低于10仍完成至少一项重点项目', points: 4 },
    {
        id: 'all_loyal',
        name: '铁三角团队',
        desc: '核心下属忠诚同时超过80',
        points: 5,
        cond: (g) => Array.isArray(g.staff) && g.staff.length >= 3 &&
            g.staff.every(s => (s.loyalty ?? 0) > 80)
    },
    {
        id: 'admission_streak',
        name: '三连涨',
        desc: '连续三月学生评价上升',
        points: 4,
        cond: (g) => (g.admissionStreak ?? 0) >= 3
    }
];

export const DIFFICULTY_PRESETS = {
    normal: { name: '标准开局', init: {} },
    hell: { name: '地狱开局', init: { funds: -15, morale: -8, studentEval: -6 } },
    power: { name: '顺风开局', init: { funds: 12, academicRep: 4, adminRep: 4 } }
};

export const STUDENT_ARCHETYPES = [
    { id: 'lihua', name: '李华', tag: '学霸型' },
    { id: 'zhangwei', name: '张伟', tag: '创业型' },
    { id: 'chenyu', name: '陈雨', tag: '公益型' },
    { id: 'suning', name: '苏宁', tag: '竞赛型' }
];
