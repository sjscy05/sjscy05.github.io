export function choice(text, days, effect, feedback, extra = {}) {
    return { text, days, effect, feedback, ...extra };
}

// ===== 素材库：学生评论池 =====
export const STUDENT_COMMENTS = {
    positive: [
        'QQ群弹出一条消息：「院长信箱回得挺快，有点意外。」',
        '你路过食堂时听到有学生说：「我们系主任好像真在干事。」',
        '朋友圈有人发：「今天教务系统居然没崩，感动中国。」',
        '匿名问卷反馈：「学院最近的活动质量明显上来了。」',
        '走廊里一个学生打招呼说：「院长，实验室的新设备太好用了！」',
        '校园论坛热帖：《理学院这届领导班子是近几年最靠谱的》',
        '学生在班会上提议：「给院长写封感谢信吧。」',
        '有毕业生回校时说：「早知道咱们系现在这么好，我就不急着毕业了。」'
    ],
    negative: [
        'QQ群匿名消息：「院长到底知不知道我们宿舍空调坏了三年？」',
        '论坛热帖升温：「理学院的课表排得让人想退学。」',
        '班委转达：「同学们觉得信息传达太慢了，很多通知都滞后。」',
        '有人在你办公桌上留了一张纸条，没署名：「实验室预约系统什么时候能修好？」',
        '教务处转来一段录音：「学生座谈会情绪比较激动，你要不要听？」',
        '论坛新帖：《理学院：一个不断消耗学生耐心的专业》',
        '学生干部委婉地提醒：「同学们最近意见比较大，您要不要出面说两句？」',
        '一封匿名信夹在文件里：「院长，我们不是机器。」'
    ]
};

// ===== 素材库：教师评论池 =====
export const TEACHER_COMMENTS = {
    positive: [
        '青年教师王群在走廊里跟同事说：「新院长给的项目启动经费确实比往年多。」',
        '教学委员会反馈：「主任最近批报销快了很多。」',
        '一位老教授在教研会上感慨：「这届领导至少知道我们教研室在做什么。」',
        '茶水间有人聊：「院长上次听课居然真做了笔记，不是走过场。」',
        '工会活动时有人开玩笑：「你别把院长累倒，这届是我见过最能跑的。」',
        '年终述职时，教研室主任在总结里写了一句：「感谢学院领导对一线教学的关注。」',
        '后勤老师私下说：「院长签字比以前那位干脆多了。」'
    ],
    negative: [
        '实验室门口贴着值班表，有人用红笔在院长签字处画了个圈。',
        '教研会上，一位教授直接说：「我觉得这个月的工作安排不合理。」',
        '教务处私下反馈：「几位老教师对您的排课方案有意见，觉得没有征求他们的意见。」',
        '你路过教研室时听到：「改革改得我们连正常上课的时间都要挤了。」',
        '有教师在群里发了一句：「报销流程倒是快了，但钱越来越少。」',
        '一位副教授在走廊与你擦肩而过，只点了点头没有说话。',
        '学术委员会内部消息：「有几个老师私下在联系外校的工作机会。」',
        '年终考评的匿名意见栏里写着：「管理风格偏行政化，学术尊重不够。」'
    ]
};

// ===== 素材库：上级/校外评价池 =====
export const LEADERSHIP_COMMENTS = {
    positive: [
        '周校长在办公会上说：「物理系最近势头不错，考虑给个表彰。」',
        '一家企业的HR打来电话：「你们学院的毕业生功底很扎实。」',
        '兄弟院校的同行在微信上问：「你们主任的联系方式方便给一下吗？」',
        '合作方的反馈：「上次会议的会务做得地道，下次还找你们。」',
        '校领导办公室转来一封表扬信，署名是一个毕业多年的校友。',
        '省级教学指导委员会的简报里提到了你们的改革案例。',
        '财务处处长在走廊里小声说：「你们院今年的预算执行率是最好的。」'
    ],
    negative: [
        '周校长打来电话，语气平静但压着底线：「听说你们学院最近有点乱？评估专家那边注意点。」',
        '一家企业HR委婉地说：「你们系学生简历上写的研究经历，有几个根本经不起问。」',
        '某期刊编辑在电话里说：「我看到你们系的学生论文了，有想法，但格式一塌糊涂。」',
        '校纪委办公室打来电话询问某笔经费的使用情况。',
        '区教育局的例行检查报告里，用「管理精细度有待提升」来评价你们学院。',
        '一位退休老教授给学校写了封信，批评「现在的管理过于行政化」。'
    ]
};

// ===== 素材库：通用随机事件池（每月必触发） =====
export const GENERIC_RANDOM_EVENTS = [
    {
        title: '教材混用风波',
        text: '教务办发现本学期有班级用了旧版教材，已经有学生发现并开始投诉。',
        choices: [
            choice('紧急更换教材', 4, { funds: -3, studentEval: 4 }, '你推动加急采购，学生的不满逐渐平息。'),
            choice('发通知解释并承诺下期更换', 2, { studentEval: -2, adminRep: 1 }, '风险暂时可控，但论坛上已有帖子开始发酵。')
        ]
    },
    {
        title: '新生迷惘来信',
        text: '一个大一新生写信到院长信箱：「院长，学这个有前途吗？我家里一直让我转专业。」',
        choices: [
            choice('亲自回信鼓励', 5, { studentEval: 4, morale: 2 }, '你的回信被拍照发到班级群，新生情绪明显稳定。'),
            choice('让辅导员代为回复', 2, { studentEval: 1 }, '辅导员安抚了学生，但你错过了建立信任的机会。')
        ]
    },
    {
        title: '实验室跳闸抢修',
        text: '实验室空调和服务器同时跳闸，设备负责人连夜抢修后申请调休。',
        choices: [
            choice('批准调休并安排慰问', 3, { morale: 4, funds: -1 }, '负责老师非常感动，说下次设备升级一定优先考虑咱们方案。'),
            choice('正常处理，记加班工时', 1, { morale: -1 }, '流程合规，但负责人觉得缺少人情味。')
        ]
    },
    {
        title: '教师课堂争议言论',
        text: '有教师在上课时发表了争议性言论，被学生录屏发到了网上。',
        choices: [
            choice('内部谈话并发出警示', 5, { adminRep: 3, morale: -2 }, '你处理及时，校纪委认可你的反应速度。'),
            choice('冷处理，不回应也不追责', 2, { studentEval: -3, adminRep: -1 }, '热度慢慢过去，但部分学生对你失望。')
        ]
    },
    {
        title: '食堂涨价联名信',
        text: '食堂涨价后学生联名要求学院补贴，校学生会转交了一份联名信到你桌上。',
        choices: [
            choice('协调后勤并给予临时补贴', 5, { funds: -5, studentEval: 5 }, '补贴发放后舆情明显降温。'),
            choice('发公开信说明情况', 3, { studentEval: -1, adminRep: 2 }, '学生理解但不完全满意。')
        ]
    },
    {
        title: '校运会拔河比赛',
        text: '校运会即将到来，学生会在群里发起请愿，希望院长带队参加拔河比赛。',
        choices: [
            choice('亲自下场带队参赛', 4, { studentEval: 6, morale: 3 }, '比赛输了但学生很开心，你的表情包在群里疯传。'),
            choice('派代表参加', 2, { studentEval: 1 }, '代表参加了，但学生们觉得你该亲自来的。')
        ]
    },
    {
        title: '老校友回校合作',
        text: '一位毕业多年的校友通过校友会联系到你，表示想与学院开展项目合作。',
        choices: [
            choice('亲自接待洽谈', 5, { funds: 5, adminRep: 3, morale: 1 }, '校友非常满意，当场敲定了合作框架。'),
            choice('让副院长接待', 3, { funds: 2, adminRep: 1 }, '合作推进正常，但校友有些遗憾没有见到你。')
        ]
    },
    {
        title: '论文版面费申请',
        text: '你的第一篇任期论文被期刊接收了，但需要自付高额版面费。',
        choices: [
            choice('让学院报销', 3, { funds: -5, reputation: 4 }, '论文顺利发表，学术端对你的支持表示感谢。'),
            choice('自掏腰包', 2, { morale: 1, reputation: 2 }, '论文发表了，但私下有人议论你绕过了报销流程。')
        ]
    },
    {
        title: '国际项目配套资金',
        text: '下属李立诚申请了一个国际合作项目，希望能配套一笔启动资金。',
        choices: [
            choice('全力支持配套', 4, { funds: -8, academicRep: 7 }, '项目获批，学术影响力明显提升。', { staff: 'acad_director' }),
            choice('部分支持', 3, { funds: -3, academicRep: 3, adminRep: 1 }, '项目规模缩小，但好歹保住了合作窗口。')
        ]
    },
    {
        title: '老教授集体生日',
        text: '王明远建议给几位即将退休的老教授过集体生日，需要申请一笔小经费。',
        choices: [
            choice('批准并亲自出席', 4, { funds: -2, morale: 5, adminRep: 2 }, '老教授们非常感动，教研室气氛空前融洽。'),
            choice('让工会负责操办', 2, { morale: 2 }, '活动办了，但你没有出席让几位老教授有点失落。')
        ]
    }
];

// ===== 素材库：高校实事改编事件 =====
export const REAL_UNIVERSITY_EVENTS = [
    {
        title: '选课系统崩溃',
        text: '选课当天系统瘫痪半小时，学生们在论坛上骂声一片，纷纷@院长信箱。',
        choices: [
            choice('督促信息中心升级服务器', 5, { funds: -4, studentEval: 5, adminRep: 2 }, '系统升级后稳定运行，下一轮选课没有再出问题。'),
            choice('发道歉信安抚', 2, { studentEval: -1 }, '道歉信被截图传到了同学群，有人评论「光说没用」。')
        ]
    },
    {
        title: '食堂价格战',
        text: '学校食堂与小摊贩之间爆发价格竞争，学生抱怨食堂贵、小摊脏。',
        choices: [
            choice('联合后勤推出特价套餐', 4, { funds: -3, studentEval: 4, morale: 1 }, '特价套餐受到欢迎，食堂人流回升。'),
            choice('放任市场调节', 1, { studentEval: -2 }, '短期无事，但长期口碑在下滑。')
        ]
    },
    {
        title: '宿舍空调大战',
        text: '气温骤降，宿舍供暖不足引发大规模投诉，班长群的消息几乎每分钟一条。',
        choices: [
            choice('紧急联系后勤加供暖', 5, { funds: -3, studentEval: 6, morale: 2 }, '供暖改善后，学生们在群里刷了一排「院长万岁」。'),
            choice('发通知解释正在排期', 2, { studentEval: -3, adminRep: 1 }, '解释很官方，学生很不满意。')
        ]
    },
    {
        title: '实验室煮火锅',
        text: '有学生在实验室用电炉煮火锅被值班老师抓了现行。处理不好可能引发纪律处分争议。',
        choices: [
            choice('批评教育并取消评优资格', 3, { adminRep: 2, studentEval: -2, morale: 1 }, '纪律得到了维护，但学生们觉得你太死板。'),
            choice('口头警告，私下了解情况', 2, { studentEval: 1, morale: 2 }, '你发现他们是因为食堂太贵才自己煮，于是协调了食堂。')
        ]
    },
    {
        title: '毕业表情包风波',
        text: '毕业生自制的吐槽表情包在校内广泛传播，部分内容涉及学院管理问题。',
        choices: [
            choice('幽默回应并邀请毕业生座谈', 4, { studentEval: 5, morale: 2, adminRep: 1 }, '你的幽默回应被大量转发，毕业生感受到被尊重。'),
            choice('要求删除并严肃处理', 3, { studentEval: -4, morale: -3 }, '表情包被删了，但学生私下的不满更多了。')
        ]
    },
    {
        title: '论文查重疑云',
        text: '毕业季论文查重结果公布后，有学生质疑查重系统存在误判，要求人工复核。',
        choices: [
            choice('组织人工复核小组', 5, { studentEval: 4, morale: 1, adminRep: 2 }, '复核结果公布后，查重争议逐渐平息。'),
            choice('维持系统判定结果', 2, { studentEval: -3, academicRep: -1 }, '几名学生申诉未果后向校学术委员会反映。')
        ]
    },
    {
        title: '共享单车坟场',
        text: '校园里堆积了大量废弃共享单车，物业要求学院清理所占区域。',
        choices: [
            choice('协调物业统一清理', 4, { funds: -2, studentEval: 3, adminRep: 2 }, '清理后校园美观度提升，学生出行也没有受影响。'),
            choice('发通知让学生自行处理', 1, { studentEval: -2 }, '通知发了但效果甚微，物业打来电话催第二次。')
        ]
    },
    {
        title: '教师节锦旗事件',
        text: '学生们自发筹集经费给最受欢迎的老师订做了一面锦旗，但在颁发时发现名字写错了。',
        choices: [
            choice('幽默化解并重新定做', 3, { morale: 4, studentEval: 3 }, '你出面打了圆场，场面从尴尬变成了笑声。'),
            choice('让学生自己处理', 1, { morale: -1, studentEval: -1 }, '学生自行解决了，但气氛有些僵硬。')
        ]
    },
    {
        title: '打印机诅咒',
        text: '学院唯一的彩色打印机又坏了——这已经是本学期第三次。老师们抱怨声一片。',
        choices: [
            choice('批准购买新打印机', 3, { funds: -4, morale: 4 }, '新机到位，工作效率明显提升。'),
            choice('联系保修继续维修', 2, { morale: -1, funds: -1 }, '修好了但老师们已经不想用了。')
        ]
    },
    {
        title: '办公室被锁',
        text: '你周末来办公室加班时发现钥匙打不开门——门锁坏了，而你下周还有一个重要会议的材料在里面。',
        choices: [
            choice('找开锁公司紧急处理', 2, { funds: -1, adminRep: 1 }, '门开了，材料及时取出，但后勤在报销单上画了个问号。'),
            choice('撬锁应急', 1, { adminRep: -2 }, '门开了但门框受损，后勤主任的表情一言难尽。')
        ]
    }
];

// ===== 素材库：宠物事件 =====
export const PET_EVENTS = [
    {
        id: 'P1',
        title: '流浪橘猫「学报」收养',
        text: '一只橘色流浪猫已经在学院楼下徘徊了一周。学生们给它起名「学报」，喂了它好几天。今天它直接躺在了学院大门口，似乎在等一个正式收留的决定。',
        choices: [
            choice('同意收养并在办公室安家', 3, { morale: 4, studentEval: 5 }, '「学报」正式成为学院一员。学生们在论坛刷了一整晚庆祝。', { petAdopt: 'journal_cat' }),
            choice('联系学校后勤带走处理', 2, { studentEval: -3, morale: -2 }, '学生们很失望，论坛上出现了「抓猫门」话题。')
        ],
        isPet: true
    },
    {
        id: 'P2',
        title: '学报踩键盘',
        text: '你的电脑屏幕突然黑了——「学报」在你起身泡茶时踩到了电源键，你刚写到一半的工作报告没保存。',
        choices: [
            choice('哭笑不得，重写报告', 2, { morale: 1 }, '你认命地重写了一遍，这次每五分钟存一次。'),
            choice('严肃批评并在办公室设猫禁区', 1, { studentEval: -1, morale: -2 }, '学生们听说你训了猫后表示抗议：「院长你不能这样对学报！」')
        ],
        isPet: true,
        requirePet: 'journal_cat'
    },
    {
        id: 'P3',
        title: '校犬「黑板」养老',
        text: '校园里那匹岁数很大的黑狗「黑板」最近走路明显慢了。几个学生联名写信希望学院能给校犬更好的养老条件。',
        choices: [
            choice('拨出专项经费改善狗舍', 4, { funds: -3, morale: 4, studentEval: 4 }, '你为「黑板」翻新了狗舍，学生自发成立了校园动物关爱小组。', { petAdopt: 'board_dog' }),
            choice('让后勤日常照顾', 2, { studentEval: -1 }, '后勤做了基础改善，但学生们觉得敷衍。')
        ],
        isPet: true
    },
    {
        id: 'P4',
        title: '仓鼠「光子」收养',
        text: '实验鼠繁殖计划出了点小问题：多出来的一只仓鼠被学生当作「实验室团宠」悄悄养了下来，现在面临被处理的局面。',
        choices: [
            choice('特批收养，命名「光子」', 3, { morale: 3, studentEval: 3 }, '「光子」在实验室里有了自己的小笼子，学生们给它做了实验服造型小衣服。', { petAdopt: 'photon' }),
            choice('按规定处理', 1, { studentEval: -2, morale: -2 }, '你按流程处理了，但学生们非常不舍。')
        ],
        isPet: true,
        requireDept: ['physics', 'chemistry', 'biomed']
    },
    {
        id: 'P5',
        title: '陆龟「评估」越狱',
        text: '据说前任院长养的一只陆龟「评估」已经在这栋楼里活了十几年。今天它又不见了——上次它消失三天后在档案室的纸箱里被发现。',
        choices: [
            choice('发动全员寻找', 3, { morale: 2, studentEval: 3 }, '全院师生大搜索，最终在器材室找到。大家给「评估」加了一条追踪标签。', { petAdopt: 'tortoise' }),
            choice('等它自己出来', 1, { adminRep: -1 }, '三天后龟自己爬出来了，但期间你错过了几次它可能捣乱的机会。')
        ],
        isPet: true,
        birthing: true
    }
];

/** 结局钩子：举报链、网红梗、李立诚冲突、约谈辞职、忠诚打击（供随机突发池抽取） */
export const ENDING_HOOK_EVENTS = [
    {
        title: '毕业照表情包疯传',
        text: '学生会把你毕业照做成了表情包合集，你是封面主角，评论区全是「院长 yyds」。',
        choices: [
            choice('自嘲转发并点赞', 2, { studentEval: 5, morale: 2 }, '学生惊呼院长竟然会自黑，话题阅读量当晚破万。', { memeSelfDeprecating: true }),
            choice('联系学生会要求下架', 3, { studentEval: -2, adminRep: 2 }, '表情包下架了，有人说你「玩不起」。')
        ]
    },
    {
        title: '匿名举报·论文署名疑云',
        text: '匿名邮件举报某位教师的论文署名存在争议。校办要求你「先内部处理再决定是否上报」。',
        choices: [
            choice('组织公开复查', 5, { adminRep: 2, academicRep: 2, morale: -2 }, '程序透明，调查中难免人心惶惶。', { scandalFair: true }),
            choice('先冷处理压消息', 2, { studentEval: -2, adminRep: -1 }, '你让团队先别声张，论坛上已经出现了零星帖子。', { scandalSuppress: true })
        ]
    },
    {
        title: '与李立诚当面争执',
        text: '学术委员会主任李立诚在会议室拍了桌子：「这笔钱不到位，课题就等于判死刑。」',
        choices: [
            choice('当场硬顶回去', 3, { morale: -4, academicRep: -2 }, '争执升级，走廊里都能听见回声。', { lichengConflict: true }),
            choice('协调折中方案', 4, { funds: -5, academicRep: 4 }, '两边都很累，但暂时保住了合作窗口。')
        ]
    },
    {
        title: '校领导约谈',
        text: '周校长发来短信：「下午来我办公室一趟，学院指标我们单独聊。」',
        choices: [
            choice('按时前往', 2, { adminRep: 2, morale: -1 }, '校长提醒你要稳住舆情与经费结构，并问你压力大不大。', { principalWarning: true, resignUnlock: true }),
            choice('委托副院长代为汇报', 2, { adminRep: -1 }, '副院长替你挡了一次火，但校长记住了这事。')
        ]
    },
    {
        title: '教研室不信任动议',
        text: '一份匿名稿在教师群里流传，矛头直指你的绩效分配方案。',
        choices: [
            choice('请学术主任出面解释', 3, { academicRep: -1, morale: -4 }, '李立诚在教研室解释得口干舌燥，仍有人拍桌子。', { staffLoyalty: { id: 'acad_director', delta: -35 } }),
            choice('自己开座谈会听意见', 4, { morale: 3, adminRep: 2 }, '吵了一下午，至少把火引到了明面上。')
        ]
    }
];

// ===== 素材库：学生深度互动事件 =====
export const STUDENT_INTERACT_EVENTS = [
    {
        id: 'S1',
        title: '学霸李华推荐信',
        text: '年级第一名李华来找你写推荐信，目标是某顶尖大学的直博项目。她的眼神里有一种让你无法拒绝的认真。',
        choices: [
            choice('用心写一封详细推荐信', 4, { studentEval: 6, academicRep: 2 }, '推荐信内容被招生官专门发邮件感谢，李华最终被录取。她在毕业典礼上专门向你致谢。'),
            choice('让辅导员协助写推荐信', 2, { studentEval: 2 }, '流程合规，但李华有些失望——她期待的是院长亲笔。')
        ]
    },
    {
        id: 'S2',
        title: '张伟的奇怪发明',
        text: '大二学生张伟抱着一台奇怪的装置到办公室门口，说想申请一个「课外创新项目」的资金。那台装置看起来像是一台自制的检测仪。',
        choices: [
            choice('批准经费并指定导师指导', 5, { funds: -4, studentEval: 5, academicRep: 3 }, '项目后来拿到了挑战杯奖项，张伟毕业时已经有两项专利在申。'),
            choice('先做可行性评估', 3, { studentEval: 2, adminRep: 1 }, '评估拖了两个月，张伟的热情已经被流程消磨了大半。')
        ]
    },
    {
        id: 'S3',
        title: '王芳的迷茫',
        text: '大三学生王芳在院长信箱里留下了一封长信，说自己从大二开始就不确定自己是否适合这个专业，每天都像是「在完成任务」。',
        choices: [
            choice('约她面谈并安排学业规划辅导', 5, { studentEval: 5, morale: 2 }, '王芳后来调整了方向，在大四找到了自己真正感兴趣的领域。'),
            choice('转给心理中心和辅导员', 2, { studentEval: 1 }, '辅导流程启动了，但王芳觉得「院长没有认真读我的信」。')
        ]
    },
    {
        id: 'S4',
        title: '刘洋的活动请求',
        text: '学生会主席刘洋带着一整套策划案来找你——他们想办一场「学科开放日」，邀请高中生来体验实验室。',
        choices: [
            choice('支持并协调资源', 5, { funds: -3, studentEval: 6, adminRep: 2 }, '开放日大获成功，招生办表示咨询量明显上升。'),
            choice('部分支持由学生会自行筹措', 3, { studentEval: 2, morale: 1 }, '活动规模缩小了，但学生会校友自己拉了赞助。')
        ]
    },
    {
        id: 'S5',
        title: '合影请求',
        text: '一群毕业生在拍毕业照时拉你来合影——他们已经在办公楼外等了你一刻钟。',
        choices: [
            choice('放下手头工作出去合影', 2, { studentEval: 5, morale: 2 }, '照片被发到朋友圈，配文：「我们院长今天有点帅。」'),
            choice('让副主任代去合影', 1, { studentEval: -1 }, '学生们没说什么，但你看到有人在群里发了个「呵呵」。')
        ]
    }
];

// ===== 素材库：学期末总结叙事模板 =====
export function buildTermEndNarrative(term, stats, prevStats) {
    const openingPool = [
        `第${term}学期走到了尾声。你坐在办公室里，窗外的梧桐叶子已经${term % 4 === 0 ? '落了一地' : '变了一种颜色'}。`,
        `期末的铃声在走廊里回荡。${term}个学期过去，你慢慢适应了院长办公室的椅子和桌子上的文件高度。`
    ];
    const opening = openingPool[Math.floor(Math.random() * openingPool.length)];
    
    const bits = [opening];
    
    // 经费评语
    const fundDelta = stats.funds - prevStats.funds;
    if (fundDelta > 5) bits.push('经费方面，这个学季的操作让财务处多看了几眼——好在是正向的。');
    else if (fundDelta > 0) bits.push('经费略有结余，虽然不算多，但在当前的预算环境下已属不易。');
    else if (fundDelta > -5) bits.push('经费方面略有支出，好在没有超预算红线。');
    else bits.push('经费数字不太好看，财务处的电话你暂时不太想接。');
    
    // 学术声望评语
    const repDelta = stats.reputation - prevStats.reputation;
    if (repDelta > 5) bits.push('学术声望有所上扬，同行在私下交流中提到了你们学院的动态。');
    else if (repDelta > 0) bits.push('学术端保持稳中有升，没有大新闻就是最好的新闻。');
    else if (repDelta > -5) bits.push('学术声望略有回落，可能需要关注一下评估指标中的短板。');
    else bits.push('学术声望下滑比较明显，下一次评估会议上可能要被点名了。');
    
    // 士气评语
    const moraleDelta = stats.morale - prevStats.morale;
    if (moraleDelta > 5) bits.push('教研室的气象明显好转，有人开始约午饭了。');
    else if (moraleDelta > 0) bits.push('教师团队整体平稳，虽然谈不上热情高涨，但至少没有负面情绪扩散。');
    else if (moraleDelta > -5) bits.push('士气略有波动，个别教研室的氛围需要你多留心。');
    else bits.push('士气处于低位，走廊里的招呼声都比以前少了。');
    
    // 学生评价评语
    const studentDelta = stats.studentEval - prevStats.studentEval;
    if (studentDelta > 5) bits.push('学生对学院的好感度在上升，论坛上的风向有所转变。');
    else if (studentDelta > 0) bits.push('学生评价稳定，虽然没有爆点，但也没有投诉集中爆发。');
    else if (studentDelta > -5) bits.push('学生评价略有下滑，论坛上有些帖子需要正面回应。');
    else bits.push('学生端的情绪比较低落，你也许该安排一次直接对话。');
    
    // 展望
    const outlookPool = [
        '不管怎样，下一个学季要来了。你关上办公室的灯，走廊尽头还有一间实验室亮着。',
        '楼下有人喊你一起去吃夜宵。你想了想，把文件合上了。'
    ];
    bits.push(outlookPool[Math.floor(Math.random() * outlookPool.length)]);
    
    return bits.join('\n');
}

export function createEventData(options) {
    // 兼容旧版接口——无参数时返回原始事件
    if (!options || typeof options !== 'object') {
        return {
            fixedEvents: createFixedEvents(),
            deptSpecialEvents: createDeptSpecialEvents(),
            randomEvents: createRandomEvents(),
            dailyActions: createDailyActions(),
            focusProjects: createFocusProjects(),
            chainEvents: createChainEvents(),
            regularActions: createRegularActions(),
            genericRandomEvents: GENERIC_RANDOM_EVENTS,
            realUniversityEvents: REAL_UNIVERSITY_EVENTS,
            petEvents: PET_EVENTS,
            endingHookEvents: ENDING_HOOK_EVENTS,
            studentInteractEvents: STUDENT_INTERACT_EVENTS,
            studentComments: STUDENT_COMMENTS,
            teacherComments: TEACHER_COMMENTS,
            leadershipComments: LEADERSHIP_COMMENTS,
            buildTermEndNarrative
        };
    }

    const { game, useStaffAbility, adjustRelation, pushMessage } = options;

    const fixedEvents = createFixedEvents();
    const deptSpecialEvents = createDeptSpecialEvents();
    const randomEvents = createRandomEvents();
    const chainEvents = createChainEvents();

    const dailyActions = [
        { id: 'leave', text: '教师临时请假排班', days: 2, effect: { morale: 2 }, tag: 'admin' },
        { id: 'dorm', text: '学生宿舍投诉处理', days: 3, effect: { studentEval: 3 }, tag: 'student' },
        { id: 'repair', text: '实验设备报修审批', days: 3, effect: { funds: -2, academicRep: 2 }, tag: 'lab' },
        { id: 'finance', text: '报销积压清理', days: 2, effect: { morale: 1, adminRep: 2 }, tag: 'admin' },
        { id: 'forum', text: '回应论坛热点帖', days: 2, effect: { studentEval: 2, adminRep: 1 }, tag: 'student' }
    ];
    const focusProjects = [
        { id: 'research', text: '攻关科研项目', days: 7, effect: { academicRep: 9 }, tag: 'academic' },
        { id: 'teaching', text: '推进教学改革', days: 6, effect: { studentEval: 7, morale: -1 }, tag: 'teaching' },
        { id: 'enterprise', text: '企业合作拓展', days: 6, effect: { funds: 10, adminRep: 2 }, tag: 'external' },
        { id: 'team', text: '教师团队建设', days: 5, effect: { morale: 6 }, tag: 'morale' }
    ];
    const regularActions = createRegularActions();

    return {
        fixedEvents,
        deptSpecialEvents,
        randomEvents,
        dailyActions,
        focusProjects,
        chainEvents,
        regularActions,
        endingHookEvents: ENDING_HOOK_EVENTS
    };
}

function createFixedEvents() {
    return {
        1: {
            title: '新学期开学典礼',
            text: '开学周连续爆出宿舍、选课和家长咨询问题，你必须快速定调。',
            choices: [
                choice('亲自盯全流程', 6, { studentEval: 6, morale: 3, adminRep: 1 }, '你在一线跑完整周，学生口碑明显回升。'),
                choice('委托教务办主任', 4, { studentEval: 4, adminRep: 2 }, '教务办把流程压住了，但学术端感觉被边缘。', { staff: 'admin_director' })
            ]
        },
        2: {
            title: '期中教学检查风波',
            text: '教务处突击检查发现部分课程考勤下滑、作业批改滞后，通报即将下发。',
            choices: [
                choice('全院通报整改', 5, { studentEval: 3, morale: -2, adminRep: 4 }, '你雷厉风行，通报发出后各系连夜补齐了材料，校方表示认可。'),
                choice('私下联系各教研室主任', 3, { morale: 2, adminRep: 1 }, '你逐一电话沟通，将问题消化在内部，避免了公开通报。'),
                choice('委托教学主任处理', 4, { studentEval: 2, adminRep: 2 }, '教学主任逐班核查，你得以腾出手处理其他事务。', { staff: 'teach_director' })
            ]
        },
        3: {
            title: '招生宣传窗口期',
            text: '重点中学宣讲和线上投放撞期，学院只能优先选一个方向发力。',
            choices: [
                choice('线下跑校宣讲', 7, { studentEval: 8, funds: -4 }, '你连跑多地，生源质量上扬。'),
                choice('线上矩阵投放', 5, { studentEval: 6, funds: -8, adminRep: 1 }, '覆盖面变大，但预算吃紧。'),
                choice('保持中性投入', 3, { studentEval: 1 }, '短期无明显波动。')
            ]
        },
        4: {
            title: '年终绩效分配博弈',
            text: '绩效奖金分配方案引发各方不满——教学端抱怨课时费低，学术端指责成果奖励少，行政希望你兜底。',
            choices: [
                choice('向教学倾斜', 6, { morale: 4, academicRep: -3, studentEval: 2 }, '教师满意了，但学术骨干私下表达了不满。'),
                choice('奖励学术成果', 5, { academicRep: 5, morale: -2, funds: -7 }, '科研产出明年可期，但一线教师颇有微词。'),
                choice('均衡分配加少量补贴', 4, { morale: 1, funds: -3 }, '各方都不满意但也都不反对——典型的妥协方案。')
            ]
        },
        5: {
            title: '企业实习基地拓展',
            text: '校企合作办公室接到多家企业合作意向，但距离远、成本高、师资不足——你必须决定如何回应。',
            choices: [
                choice('签约三家扩大版图', 7, { studentEval: 7, funds: 6, morale: -3, academicRep: -1 }, '实习版图扩张，但教师带教负荷明显加大。'),
                choice('精选一家深度合作', 5, { studentEval: 4, funds: 3, adminRep: 3 }, '合作质量很高，学校领导在校务会上点名表扬。'),
                choice('先做调研暂不签约', 3, { academicRep: 1 }, '你稳健行事，但学生在论坛表达了失望。')
            ]
        },
        6: {
            title: '学科评估冲刺',
            text: '校内要求你在短期内提交评估材料，教学与学术端都在争资源。',
            choices: [
                choice('全力冲刺材料', 8, { academicRep: 9, morale: -3 }, '申报质量高，但团队有疲态。'),
                choice('委托学术主任主导', 6, { academicRep: 7, adminRep: 1 }, '学术输出稳定，管理负担降低。', { staff: 'acad_director' }),
                choice('保守提交', 4, { academicRep: -2, morale: 1 }, '压力较小，但排名提升有限。')
            ]
        },
        7: {
            title: '校园文化节与学术周冲突',
            text: '学生会策划的文化节与学术委员会的国际会议撞在同一周。两边都不愿让步，你必须决策。',
            choices: [
                choice('支持文化节，推迟会议', 5, { studentEval: 7, morale: 1, academicRep: -3 }, '学生一片欢呼，但邀请的海外学者改期后可能不来了。'),
                choice('保障学术会议，文化节简化', 6, { academicRep: 5, studentEval: -2, morale: -2 }, '会议圆满成功，但学生们抱怨学院太重视科研。'),
                choice('两个都办，你两边跑', 8, { academicRep: 2, studentEval: 4, morale: 2, adminRep: 3 }, '你筋疲力尽但两场活动都体面收场。')
            ]
        },
        8: {
            title: '期末工作总结与新学年规划',
            text: '学年末，校领导要求各院系提交工作总结和来年预算草案。数据显示部分指标未达标。',
            choices: [
                choice('坦诚汇报，申请追加预算', 5, { adminRep: 3, funds: 8, morale: 2 }, '校领导欣赏你的坦诚，追加预算获批。'),
                choice('美化数据争取更多拨款', 4, { funds: 12, adminRep: -5, morale: -1 }, '拨款到账了，但半年后审计风险让你夜不能寐。'),
                choice('稳健汇报，不争不抢', 3, { adminRep: 1 }, '波澜不惊——校领导觉得你稳重，但也觉得缺乏亮点。'),
                choice('借机提出院系改革方案', 7, { academicRep: 3, adminRep: 2, morale: -3, funds: -5 }, '你递交了激进的改革方案，引发校内讨论。')
            ]
        }
    };
}

function createDeptSpecialEvents() {
    return {
        cs: {
            title: '大模型实验班风波',
            text: '企业希望共建，老师担心教学质量，学生期待很高。',
            choices: [
                choice('快速试点', 6, { studentEval: 7, funds: 4, morale: -3 }, '热度拉满，但内部争议上升。'),
                choice('先做论证', 5, { academicRep: 4, studentEval: 2, adminRep: 2 }, '节奏慢些，但整体认可度更稳。')
            ]
        },
        literature: {
            title: '经典阅读计划争议',
            text: '学生想减背诵，教师坚持经典训练，你需要给出平衡方案。',
            choices: [
                choice('双轨考核', 5, { studentEval: 5, morale: 2 }, '争议降温，教学秩序趋稳。'),
                choice('维持原标准', 4, { academicRep: 4, studentEval: -3 }, '守住规范，但学生满意度回落。')
            ]
        }
    };
}

function createRandomEvents() {
    return [
        {
            title: '青年教师被挖角',
            text: '外部高薪邀约到来，团队气氛出现波动。',
            choices: [
                choice('加码留人', 6, { funds: -10, morale: 6 }, '你稳住了关键骨干。'),
                choice('体面放人', 3, { morale: -4, academicRep: -2 }, '团队对学院吸引力产生担忧。')
            ]
        },
        {
            title: '学生论坛设备投诉',
            text: '实验设备老旧话题冲上校内热榜。',
            choices: [
                choice('优先维修关键设备', 5, { funds: -7, studentEval: 5 }, '学生反馈明显转正。'),
                choice('发公告解释并排期', 2, { studentEval: -2, adminRep: 1 }, '风险暂时可控，但并未消失。')
            ]
        },
        {
            title: '神秘校友匿名捐赠',
            text: '校友会突然转来一笔款项，附言「请把钱花在刀刃上」。',
            choices: [
                choice('投教学基础', 4, { funds: 12, studentEval: 4 }, '课堂条件快速改善。'),
                choice('投前沿课题', 4, { funds: 10, academicRep: 5 }, '学术端立即受益。')
            ]
        },
        {
            title: '实验室安全事故',
            text: '轻伤事故引发舆论关注，学校要求立即处理。',
            choices: [
                choice('停摆整顿', 6, { funds: -8, morale: -2, studentEval: 3, adminRep: 2 }, '短期成本高，但公信力回升。'),
                choice('局部整改', 3, { funds: -4, academicRep: -3 }, '处理速度快，但透明度被质疑。')
            ]
        }
    ];
}

function createDailyActions() {
    return [
        { id: 'leave', text: '教师临时请假排班', days: 2, effect: { morale: 2 }, tag: 'admin' },
        { id: 'dorm', text: '学生宿舍投诉处理', days: 3, effect: { studentEval: 3 }, tag: 'student' },
        { id: 'repair', text: '实验设备报修审批', days: 3, effect: { funds: -2, academicRep: 2 }, tag: 'lab' },
        { id: 'finance', text: '报销积压清理', days: 2, effect: { morale: 1, adminRep: 2 }, tag: 'admin' },
        { id: 'forum', text: '回应论坛热点帖', days: 2, effect: { studentEval: 2, adminRep: 1 }, tag: 'student' }
    ];
}

function createFocusProjects() {
    return [
        { id: 'research', text: '攻关科研项目', days: 7, effect: { academicRep: 9 }, tag: 'academic' },
        { id: 'teaching', text: '推进教学改革', days: 6, effect: { studentEval: 7, morale: -1 }, tag: 'teaching' },
        { id: 'enterprise', text: '企业合作拓展', days: 6, effect: { funds: 10, adminRep: 2 }, tag: 'external' },
        { id: 'team', text: '教师团队建设', days: 5, effect: { morale: 6 }, tag: 'morale' }
    ];
}

function createChainEvents() {
    return [
        { title: '连锁：预算二次说明', text: '财务要求补充材料。', days: 2, effect: { funds: 1, adminRep: 1 } },
        { title: '连锁：舆情继续发酵', text: '校内论坛继续追问。', days: 2, effect: { studentEval: -1, adminRep: 1 } },
        { title: '连锁：跨部门协调会', text: '教学与学术端争资源。', days: 2, effect: { morale: -1, adminRep: 2 } }
    ];
}

function createRegularActions() {
    const regActions = [
        {
            text: '🔬 攻关科研项目 (精力-14，学术+5，经费-3)',
            cond: () => true,
            act: () => { game.energy -= 14; game.reputation += 5; game.funds -= 3; }
        },
        {
            text: '📖 推动教学改革 (精力-12，学生评价+4，士气-2)',
            cond: () => true,
            act: () => { game.energy -= 12; game.studentEval += 4; game.morale -= 2; }
        },
        {
            text: '🤝 拉企业赞助合作 (精力-10，经费+6，行政信誉+1)',
            cond: () => true,
            act: () => { game.energy -= 10; game.funds += 6; game.adminRep += 1; }
        },
        {
            text: '🎯 组织教师团建 (精力-8，士气+4，学生评价+1)',
            cond: () => true,
            act: () => { game.energy -= 8; game.morale += 4; game.studentEval += 1; }
        }
    ];
    return regActions;
}