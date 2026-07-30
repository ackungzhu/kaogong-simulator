/**
* 《上岸模拟器》 v0.6
* 新增：存档读取/续玩 + 事件频率+权重算法修复 + 模态关闭 + 移动端适配 + 2个高质量新事件
* v0.5基线：事件稀有度引擎 + 8个高传播力事件 + 范进体系彩蛋
* v0.4基线：人生标签 + 24h时间制 + 起床/赖床/熬夜系统
*/

// ========== 人生标签库（开局多选）==========
// 每个标签影响初始数值、触发偏好、特殊事件解锁
const LIFE_TAGS = [
  { id: "foxi", emoji: "🍃", name: "佛系", desc: "不争不抢，顺其自然",
    delta: { mood: 8, sanity: 8, study: -5 },
    perk: "面对失败心态-50%惩罚，但学习效率-10%" },
  { id: "45du", emoji: "📐", name: "45度青年", desc: "不躺不卷，维持最低限度努力",
    delta: { study: 3, mood: 5 },
    perk: "刷题学习收益+10%，但无法触发'肝帝'结局" },
  { id: "iren", emoji: "🤐", name: "I人", desc: "MBTI内向型社交者",
    delta: { sanity: 5, relation: -8 },
    perk: "社交事件消耗精神+5，但独处事件加成+30%" },
  { id: "eren", emoji: "🎤", name: "E人", desc: "MBTI外向型社交者",
    delta: { relation: 10, mood: 5, study: -3 },
    perk: "社交事件加成+30%，但难抵御诱惑（朋友约总要去）" },
  { id: "xiaozhen", emoji: "🎯", name: "小镇做题家", desc: "靠考试改变命运，但天花板明显",
    delta: { study: 12, sanity: -5, mood: -3 },
    perk: "刷题/模考效率+20%，但'相亲'/'同学聚会'事件心态-50%" },
  { id: "fafeng", emoji: "🤪", name: "发疯文学", desc: "用夸张表达释放情绪",
    delta: { mood: 10, sanity: -5 },
    perk: "解锁特殊'淡淡地疯了'选项，崩溃边缘有20%概率反弹" },
  { id: "dagongren", emoji: "👔", name: "打工人/社畜", desc: "上班族的自我调侃",
    delta: { money: 8, sanity: -5, mood: -3 },
    perk: "兼职收益+30%，但每月强制扣班味debuff（除非裸辞）" },
  { id: "niuma", emoji: "🐂", name: "牛马", desc: "感觉自己被压榨、疲于奔命",
    delta: { money: 10, mood: -10, sanity: -8 },
    perk: "兼职收益+50%，但每日体力上限-1" },
  { id: "jingzhiqiong", emoji: "💸", name: "精致穷", desc: "花钱讲品质，但其实没什么钱",
    delta: { money: -10, mood: 8 },
    perk: "'好好吃饭'心态加成翻倍，但消费-50%（更费钱）" },
  { id: "xianyanbao", emoji: "🌟", name: "显眼包", desc: "爱表现、社交活跃",
    delta: { relation: 15, mood: 10, study: -3 },
    perk: "解锁'拍照分享'类隐藏事件，社交事件关系收益翻倍" },
  { id: "danren", emoji: "💧", name: "淡人", desc: "情绪浓度低",
    delta: { sanity: 12, mood: -3 },
    perk: "心态/精神波动幅度-30%（更稳）" },
  { id: "nongren", emoji: "🔥", name: "浓人", desc: "情绪浓度高",
    delta: { mood: 8, sanity: -8 },
    perk: "情绪事件波动+50%，触发范进体系概率+30%" },
  { id: "xinqiong", emoji: "🪙", name: "新穷人", desc: "收入不低但存不下钱、没有安全感",
    delta: { money: 5, sanity: -8, mood: -5 },
    perk: "钱包归零延迟（多撑5天），但每月生活费消耗+30%" },
];



// ========== 每日主动行动库（带时间维度）==========
// duration: 消耗时间（小时，可为固定值或 [min, max] 随机区间）
// cost: 消耗体力（AP）
// effects: 数值影响
// flavor: 完成后旁白
// timeWindow: 可执行时间段（可选），如 [6, 22] 表示6:00-22:00才可做
const ACTIONS = [
  {
    id: "shuati", icon: "📖", name: "刷行测真题",
    desc: "粉笔五年真题",
    cost: 2, duration: 1.5,
    effects: { study: 5, mood: -2 },
    flavor: [
      "你又做错了第37题。",
      "这题的解法你明明看过，但考场一定会忘。",
      "行测刷完一套，脑子像被水泡过。",
      "粉笔解析：你思路完全错误。你：是。",
    ],
    tag: "学习",
  },
  {
    id: "beishen", icon: "📝", name: "背申论模板",
    desc: "《申论100题》第四遍了",
    cost: 2, duration: 1.5,
    effects: { study: 4, mood: -3, sanity: -1 },
    flavor: [
      "'作为一名公职人员……'",
      "你已经能把第3模块倒背如流。",
      "半小时后你发现背错了范文。",
      "申论老师说这题能得25+。你得了15。",
    ],
    tag: "学习",
  },
  {
    id: "wangke", icon: "💻", name: "看网课",
    desc: "2倍速听导师开麦",
    cost: 2, duration: 1,
    effects: { study: 3, mood: 2 },
    flavor: [
      "老师：'同学们！这道题太简单了！'",
      "2倍速+15秒跳过，一节课15分钟看完。",
      "弹幕：'别念PPT了，直接发课件吧。'",
      "老师今天的领带换了。你没学到东西，但记住了这个细节。",
    ],
    tag: "学习",
  },
  {
    id: "moukao", icon: "📊", name: "模考自测",
    desc: "粉笔周赛冲一把",
    cost: 3, duration: 3,
    effects: { study: 7, mood: -5, sanity: -3 },
    flavor: [
      "行测 48.6。平均 62。你的排名是后 30%。",
      "模考结束后你才发现涂错了答题卡。",
      "数量关系全蒙 C，蒙对 4 个。",
      "'模考就是为了找信心的。' 你的信心变成了负数。",
    ],
    tag: "学习",
  },
  {
    id: "moyu", icon: "🐟", name: "摸鱼",
    desc: "刷抖音/B站/小红书",
    cost: 1, duration: 1,
    effects: { mood: 8, sanity: 3, study: -1 },
    flavor: [
      "你开了'上岸模拟器'，玩了一局。",
      "抖音推送了 12 条考公博主视频，你一条没看。",
      "一小时过去了。你看了 37 个15秒的短视频。",
      "你收藏了 5 条 '考公必背' 视频。从来没打开过。",
    ],
    tag: "休闲",
  },
  {
    id: "yundong", icon: "🏃", name: "去跑步",
    desc: "绕操场跑3圈",
    cost: 2, duration: 1,
    effects: { mood: 10, sanity: 5, study: -2 },
    flavor: [
      "第二圈你就想回家了。",
      "跑完感觉神清气爽。晚饭多吃了两碗。",
      "你遇到一个也在跑步的人，他/她也在备考。",
      "'身体是革命的本钱。'但革命还没开始。",
    ],
    tag: "休闲",
  },
  // === 吃饭：3 种规模，时间不同 ===
  {
    id: "chifan_solo", icon: "🍱", name: "独自吃饭",
    desc: "外卖/食堂随便扒两口",
    cost: 1, duration: 0.5,
    effects: { mood: 4, money: -2, sanity: 1 },
    flavor: [
      "外卖小哥说：'加油！' 你愣了一下，说：'谢谢。'",
      "便利店关东煮 12 块，你吃出了米其林的感觉。",
      "你边吃边背单词，结果忘了加饭。",
      "食堂阿姨多给了你一块红烧肉。今天值得了。",
    ],
    tag: "休闲",
  },
  {
    id: "chifan_friend", icon: "🍜", name: "和朋友吃饭",
    desc: "喊一个研友/同学",
    cost: 1, duration: 1,
    effects: { mood: 8, money: -5, relation: 5, sanity: 2 },
    flavor: [
      "他/她也在抱怨备考。你们成了精神同盟。",
      "AA了 38 块，你心想：原来友谊也是有价签的。",
      "聊到考公就停不下来，吃完饭已经过了 2 小时。",
      "他说：'我们都会上岸的。'你说：'嗯。'",
    ],
    tag: "社交",
  },
  {
    id: "juhui", icon: "🍻", name: "出去聚餐",
    desc: "好几个朋友一起吃",
    cost: 2, duration: [3, 5],   // 随机 3-5 小时
    effects: { mood: 12, money: -15, relation: 10, study: -3, sanity: -3 },
    flavor: [
      "酒过三巡，老王哭着说他要二战。",
      "你点了 3 杯青岛，结账时是 387 块。",
      "凌晨回家路上看星星——你想到了爸爸。",
      "聚餐后第二天，你头疼到中午才起。",
    ],
    tag: "社交",
  },
  {
    id: "chuqu_wan", icon: "🎢", name: "出去玩",
    desc: "环球影城/迪士尼/演唱会",
    cost: 3, duration: [6, 10],  // 占用一整天
    effects: { mood: 25, money: -40, relation: 5, study: -8, sanity: 8 },
    flavor: [
      "你在游乐园里跑得像个10岁小孩。",
      "演唱会现场你哭了。不是因为唱得好，是因为终于不用想行测了。",
      "回家后你在地铁上睡着了，错过了3站。",
      "拍了200张照片，发了2张到朋友圈。",
    ],
    tag: "休闲",
  },
  {
    id: "shuijiao", icon: "😴", name: "白天小憩",
    desc: "午睡30分钟",
    cost: 0, duration: 0.5,
    effects: { sanity: 8, mood: 3 },
    flavor: [
      "你梦见自己上岸了。醒来时哭了 1 分钟。",
      "睡了 30 分钟，醒来神清气爽。",
      "本来想睡30分钟，结果睡了2小时。（实际还是只算30分钟）",
      "你发现午睡是世界上最便宜的快乐。",
    ],
    tag: "休闲",
  },
  {
    id: "xiaojiao", icon: "👥", name: "和朋友社交",
    desc: "约老同学/研友",
    cost: 2, duration: 2,
    effects: { relation: 8, mood: 5, money: -3, study: -3 },
    flavor: [
      "你们聊到了凌晨。",
      "朋友请客了。下次你请。你知道下次是什么时候。",
      "KTV 唱《平凡之路》唱到一半哭了。",
      "大家都在焦虑。不只是你。",
    ],
    tag: "社交",
  },
  {
    id: "jianzhi", icon: "💰", name: "接兼职",
    desc: "发传单/陪诊/写文稿",
    cost: 3, duration: 4,
    effects: { money: 10, study: -5, mood: -5, sanity: -3 },
    flavor: [
      "站了 6 小时腿都肿了。赚了 120 块。",
      "甲方改了 8 次方案。给了你 300 块。",
      "'赚钱不寒碜。' 你妈说。",
      "兼职的时候你还在听申论ASMR。",
    ],
    tag: "生计",
  },
  {
    id: "xiangqin", icon: "💘", name: "相亲",
    desc: "妈安排的相亲对象",
    cost: 2, duration: 2,
    effects: { relation: 5, mood: -8, money: -5, sanity: -5 },
    flavor: [
      "对方说：'你今年能上岸吗？'",
      "你们聊了 10 分钟。互加了微信。再也没聊过。",
      "回家后你妈问：'怎么样？' 你说：'挺好。' 你妈说：'那就订吧。'",
      "相亲对象是公务员。你感觉她/他在打量你的未来。",
    ],
    tag: "社交",
  },
  {
    id: "ziyou", icon: "🧘", name: "冥想",
    desc: "坐着发呆也行",
    cost: 1, duration: 0.5,
    effects: { sanity: 8, mood: 3 },
    flavor: [
      "你坐了 20 分钟，想了 3 次自己考不上怎么办。",
      "冥想结束，你打开手机继续焦虑。",
      "你终于想通了：'焦虑也没用。' 下一秒又焦虑了。",
      "你闭上眼睛，脑子里出现了胡屠户的脸。",
    ],
    tag: "休闲",
  },
];

// ========== 起床选项 ==========
// 玩家在每天开始时选择何时起床
const WAKE_OPTIONS = [
  { id: "early", time: 6, label: "🌅 6:00 早起", desc: "晨型人战士",
    energyDelta: 2, hint: "连续早起+精力。但若昨夜睡眠不足则反而消耗精神" },
  { id: "normal", time: 8, label: "☀️ 8:00 正常起", desc: "上班族节奏",
    energyDelta: 0, hint: "标准模式，无特殊加成" },
  { id: "lazy", time: 10, label: "🛌 10:00 赖床", desc: "今天就摆烂吧",
    energyDelta: -1, hint: "晚起精力轻微下降，但心态+3" },
];





// ========== 身份 ==========
const IDENTITIES = [
  { id: "985", emoji: "🎓", name: "985 应届生", desc: "高起点但迷茫",
    init: { study: 40, mood: 70, money: 50, relation: 60, sanity: 60 },
    extra: "自带'学历光环'buff，亲戚期望值翻倍" },
  { id: "sanben", emoji: "📚", name: "三本二战", desc: "背水一战",
    init: { study: 55, mood: 40, money: 30, relation: 50, sanity: 50 },
    extra: "经验丰富，但心态易崩" },
  { id: "35plus", emoji: "💼", name: "35+ 被裁", desc: "最后的救命稻草",
    init: { study: 30, mood: 35, money: 70, relation: 70, sanity: 40 },
    extra: "钱多但时间紧，家庭压力拉满" },
];

// ========== 月份开局 ==========
const START_MONTHS = [
  { month: 3, title: "3月开局", emoji: "⚡", achievement: "你很卷，但还有卷王，你已慢了一步",
    desc: "春招季焦虑vs备考的拉扯感", delta: { study: 8, mood: 5 } },
  { month: 5, title: "5月开局", emoji: "🌸", achievement: "春困秋乏夏打盹",
    desc: "暮春不晚？", delta: { study: 3, mood: -2 } },
  { month: 7, title: "7月开局", emoji: "🔥", achievement: "你已慢了一步两步三步，要不谈个恋爱吧先",
    desc: "夏天太热学不进去+桃花运干扰", delta: { study: -2, relation: 15 } },
  { month: 9, title: "9月开局", emoji: "💀", achievement: "天崩开局！但我上面……好像也没有人啊啊啊啊啊",
    desc: "绝望中蕴藏反转可能", delta: { study: -10, mood: -15, sanity: -10 } },
  { month: 11, title: "11月开局", emoji: "🧠", achievement: "明智的选择，这么早就开始备战明年的考试了吗！",
    desc: "提前布局的从容", delta: { study: 12, mood: 8 } },
  { month: 12, title: "12月开局", emoji: "⚔️", achievement: "两战，三战，啊我到家了",
    desc: "背水一战·绝境战士", delta: { study: -20, mood: -10, sanity: -15 } },
];

// ========== 邪修路线（新） ==========
// 在早期某个月份触发"学习方法选择"事件，决定后续buff
const LEARNING_PATHS = {
  ZHENGTONG: { id: "zhengtong", name: "🏛️ 正统派", desc: "粉笔+中公+华图，五年真题+行测5000题",
    buff: "每月自动+3复习，但-2心态（枯燥）" },
  XIE_XIU:   { id: "xiexiu",    name: "🔮 邪修派", desc: "睡前听申论ASMR+食堂阿姨对话练言语+厕所背常识",
    buff: "每月随机+8或-5复习（极不稳定），但+5心态" },
  BAILAN:    { id: "bailan",    name: "🛌 佛系派", desc: "考前一周再说",
    buff: "每月+10心态+5精神，但-4复习" },
};

// ========== 搭子系统（新） ==========
// 玩家可通过事件获得最多2个搭子，每月末根据搭子类型给予被动加成
const PARTNERS = {
  xuexi:   { id: "xuexi",   name: "📖 学习搭子", emoji: "📖",
             desc: "每天图书馆打卡，互相监督", monthly: { study: 4, mood: 1 },
             flavor: "她今天又比你早到了。你加快了脚步。" },
  moukao:  { id: "moukao",  name: "📊 模考搭子", emoji: "📊",
             desc: "每周互换错题本", monthly: { study: 3, sanity: 2 },
             flavor: "他错的题你也错了——原来不是你一个人蠢。" },
  fan:     { id: "fan",     name: "🍜 饭搭子", emoji: "🍜",
             desc: "食堂吃饭互相吐槽", monthly: { mood: 5, relation: 2 },
             flavor: "午饭时他讲了个段子：'其实公务员就是穿短袖的僧人。'" },
  yanyou:  { id: "yanyou",  name: "💕 研友(暧昧线)", emoji: "💕",
             desc: "图书馆暧昧的那种", monthly: { mood: 6, relation: 3, study: -2 },
             flavor: "他给你带了豆浆。你想他是不是喜欢你。" },
};

// ========== 事件库（30+） ==========
// effects: { study, mood, money, relation, sanity }
// cond(p): p = { ...stats, month, identity, path, partners }
// setPath: 设置学习路线； addPartner: 添加搭子
const EVENTS = [
  // ============ 【学习方法·邪修分支】 ============
  {
    id: "xiexiu_choice",
    title: "学习方法的十字路口",
    weight: 5, // 高权重确保早期触发
    cond: (p) => !p.path && p.monthsPlayed <= 2,
    desc: `你在小红书刷到三篇笔记。

第一篇《粉笔五年真题这样刷就对了》——点赞 10 万。
第二篇《我用睡前ASMR听申论一个月上岸》——点赞 12 万。
第三篇《考公根本不用学，我裸考68分》——点赞 35 万。

<em>三种路线在你面前——</em>`,
    choices: [
      { label: "A", text: "🏛️ 正统派：老老实实刷粉笔",
        effects: { study: 5, mood: -3 },
        setPath: "zhengtong",
        achievement: "正统学徒" },
      { label: "B", text: "🔮 邪修派：睡前听申论ASMR+阿姨对话练言语",
        effects: { study: 3, mood: 5, sanity: 3 },
        setPath: "xiexiu",
        achievement: "邪修入门" },
      { label: "C", text: "🛌 佛系派：考前一周再说",
        effects: { mood: 10, sanity: 5, study: -5 },
        setPath: "bailan",
        achievement: "蒜鸟蒜鸟" },
    ]
  },

  // ============ 【原有核心事件】 ============
  {
    id: "hutufu",
    title: "胡屠户的嘴",
    weight: 1.5,
    cond: (p) => p.study < 60,
    desc: `你刚查了模考成绩——行测 52 分。

手机震了一下，是你妈。

她转发了一篇公众号文章：《为什么你家孩子考不上公务员》。

你点开，第一段写着：

　　"有些人啊，自己没那个能力，还<em>想一步登天</em>。"

你想起小时候你爸喝醉了说过类似的话。`,
    choices: [
      { label: "A", text: '"癞蛤蟆想吃天鹅肉，怎么了！"（愤怒反驳）',
        effects: { mood: 5, relation: -10, sanity: -5 }, achievement: "癞蛤蟆想吃天鹅肉" },
      { label: "B", text: "默默关闭对话框，打开行测题册",
        effects: { study: 5, mood: -8 } },
      { label: "C", text: '"你说得对，我不考了"（放弃）',
        effects: { study: -15, mood: 10, sanity: 5 } },
    ]
  },

  {
    id: "mama",
    title: "妈妈的电话",
    weight: 1.2,
    desc: `晚上 11 点，你刚背完第 3 遍《申论 100 题》。

妈妈打电话：

　　"隔壁王阿姨家孩子考上市局了，给了 <em>20 万彩礼</em>。
　　你什么时候上岸？"`,
    choices: [
      { label: "A", text: '"妈我在努力"', effects: { mood: -5, relation: 3 } },
      { label: "B", text: "已读不回", effects: { mood: -10, relation: -10 } },
      { label: "C", text: '"王阿姨家孩子考的三不限岗"',
        effects: { mood: 3, relation: -5 }, achievement: "揭穿话术" },
      { label: "D", text: '"外耗回去！王阿姨去年不是还二战吗？"',
        effects: { mood: 15, relation: -15, sanity: -3 }, achievement: "外耗大师" },
    ]
  },

  {
    id: "library",
    title: "图书馆的战争",
    weight: 1,
    desc: `早上 6:30，你披着睡衣来到市图书馆门口。

队伍已经排了 <em>40 多米</em>。

最前面的大爷自带折叠凳和保温杯。

你身后响起一个声音：
　　"小伙子，你是来考公还是考研？"`,
    choices: [
      { label: "A", text: '"考公。"（套近乎）', effects: { mood: 3, relation: 2 } },
      { label: "B", text: '"我卷，故我在。"（哲学家模式）',
        effects: { study: 5, sanity: -3 }, achievement: "我卷故我在" },
      { label: "C", text: "不说话，掏出粉笔 APP 开始背单词",
        effects: { study: 8, mood: -2 } },
      { label: "D", text: "突然想通了，转身回家",
        effects: { study: -5, mood: 10, sanity: 5 } },
    ]
  },

  {
    id: "peiban",
    title: "报班的诱惑",
    weight: 1,
    desc: `中公的销售小姐姐给你递了张传单：

　　"<em>协议班 19800</em>，不过退 15000！
　　你算算，相当于只花 4800 学全套课程。"

你看了看自己的银行卡余额。
你看了看传单。
你又看了看余额。`,
    choices: [
      { label: "A", text: "刷信用卡报了（'投资自己'）",
        effects: { money: -60, study: 20, mood: 8, sanity: -5 }, achievement: "大冤种" },
      { label: "B", text: "咸鱼 200 块买二手网课",
        effects: { money: -3, study: 10, mood: -2 } },
      { label: "C", text: "加免费公考群白嫖",
        effects: { study: 3, mood: -3 } },
      { label: "D", text: '"我是预制梦想的客户吗？" 礼貌拒绝',
        effects: { mood: 5, sanity: 3 } },
    ]
  },

  {
    id: "juhui",
    title: "五一同学聚会",
    weight: 1,
    cond: (p) => p.month >= 3 && p.month <= 7,
    desc: `大学室友发来微信：

　　"老王签约字节跳动了，年包 45 万。五一聚一下？"

你打开自己的日历——

五一三天假期，你的计划是：
　　刷完 3 套行测真题 + 背完《申论 100 题》。

<em>别人的生活是诗和远方，我的生活是行测和申论。</em>`,
    choices: [
      { label: "A", text: "硬着头皮去了，全程沉默",
        effects: { study: -8, mood: -15, relation: 5, sanity: -10 } },
      { label: "B", text: '"我最近在忙项目"（说谎）',
        effects: { study: 5, mood: -5, relation: -8, sanity: -5 } },
      { label: "C", text: "去了，全程讲备考段子逗笑全场",
        effects: { study: -5, mood: 10, relation: 10, sanity: 5 }, achievement: "考公脱口秀" },
      { label: "D", text: '"老王的年包是税前还是税后？"（内心阴阳）',
        effects: { mood: 3, sanity: -5 } },
    ]
  },

  {
    id: "gangwei",
    title: "岗位表的艺术",
    weight: 1.5,
    cond: (p) => p.month >= 9 || p.month <= 2,
    desc: `省考岗位表出了。

你打开 Excel，筛完专业、学历、政治面貌后——

适合你的岗位只有 <em>3 个</em>。`,
    choices: [
      { label: "A", text: "🏛️ 省直机关三不限（报录比 1:800）",
        effects: { mood: -10, sanity: -10 }, achievement: "我避他锋芒？" },
      { label: "B", text: "🏠 家乡县城乡镇（报录比 1:12，离家 80 公里）",
        effects: { study: 5, mood: 3, relation: 8 } },
      { label: "C", text: "⚰️ 冷门岗位：XX 监狱狱警（报录比 1:4）",
        effects: { study: 10, mood: -5, sanity: -8 } },
      { label: "D", text: "都不报，再等等",
        effects: { mood: 8, study: -5 } },
    ]
  },

  {
    id: "bailan_event",
    title: "深夜的赛博上坟",
    weight: 1,
    desc: `凌晨 1 点。

你今天的计划是做完一套行测。

实际完成：<em>刷了 3 小时抖音</em>。

你打开备忘录，写下今日学习时长：0 分钟。
然后你把备忘录改成了：3 分钟。`,
    choices: [
      { label: "A", text: "现在开始学！只要学不死就往死里学！",
        effects: { study: 8, mood: -8, sanity: -5 } },
      { label: "B", text: "蒜鸟蒜鸟，明天再说",
        effects: { mood: 5, sanity: 3 } },
      { label: "C", text: '"我将全职在家研究如何不学习"',
        effects: { mood: 10, sanity: -5 }, achievement: "摆烂艺术家" },
      { label: "D", text: "对着镜子骂自己 5 分钟",
        effects: { mood: -5, sanity: -3, study: 3 }, achievement: "尖嘴猴腮" },
    ]
  },

  {
    id: "mianshi_eve",
    title: "面试前夜",
    weight: 1,
    cond: (p) => p.study > 50 && p.month >= 3,
    desc: `你在酒店里已经背诵 "作为一名公职人员……" 6 个小时。

手机弹出大学室友朋友圈：
　　<em>"人生中第三个本命年，字节 offer 升职了。"</em>

你看了看镜子里的自己——头发已经快掉光了。`,
    choices: [
      { label: "A", text: "关掉朋友圈，继续背",
        effects: { study: 10, mood: -8, sanity: -5 } },
      { label: "B", text: '点了一份夜宵，"身材曼妙"地自我安慰',
        effects: { money: -2, mood: 5 } },
      { label: "C", text: "凌晨 2 点给室友打电话问内推",
        effects: { mood: 3, relation: 5, sanity: -10 }, achievement: "反向内推" },
      { label: "D", text: '在镜子前喊 "我指定是好官！考试干哈！"',
        effects: { mood: 15, sanity: -15 }, achievement: "我指定是好官" },
    ]
  },

  {
    id: "qinqi",
    title: "家族群·月度拷问",
    weight: 1,
    desc: `二姑在家族群发了一段话：

　　"隔壁老李的儿子，去年考上了市委办公厅。
　　人家大学四年每天只睡 4 小时。
　　不像有些人，<em>985 毕业待业在家</em>。"

群里有 28 个人，包括你爸你妈。`,
    choices: [
      { label: "A", text: "发一个 😊", effects: { mood: -10, relation: 3, sanity: -5 } },
      { label: "B", text: "退群", effects: { mood: 10, relation: -20, sanity: 10 }, achievement: "及时止损" },
      { label: "C", text: '"二姑家的小孩今年高考多少分？"',
        effects: { mood: 5, relation: -8, sanity: 3 } },
      { label: "D", text: "截图发给对象吐槽", effects: { mood: 8, relation: -3 } },
    ]
  },

  {
    id: "moukao",
    title: "模考心态崩了",
    weight: 1.2,
    desc: `粉笔模考开始。

行测部分：
　　政治理论——感觉每个选项都对。
　　言语理解——每个字都认识，组合起来像天书。
　　常识判断——凭感觉。

考完你看了分数：<em>41.5</em>。
平均分：62。`,
    choices: [
      { label: "A", text: '"我可能是个假考生。"', effects: { mood: -15, sanity: -5 }, achievement: "假考生" },
      { label: "B", text: "去评论区求骂醒", effects: { mood: 5, sanity: -3 } },
      { label: "C", text: '"真的栓Q了。" 关掉电脑睡觉',
        effects: { mood: 10, study: -5, sanity: 5 } },
      { label: "D", text: "开始分析错题，列出 30 条薄弱知识点",
        effects: { study: 15, mood: -10, sanity: -8 } },
    ]
  },

  // ============ 【搭子系统事件】 ============
  {
    id: "find_xuexi",
    title: "寻找学习搭子",
    weight: 0.9,
    cond: (p) => !p.partners.includes("xuexi") && p.partners.length < 2,
    desc: `小红书发帖：

　　"求北京海淀备考搭子，25岁女，省考。
　　每天图书馆打卡，互相监督。"

头像是只柯基。简介写着：<em>"已废，求救。"</em>`,
    choices: [
      { label: "A", text: "私信加微信", effects: { mood: 5, relation: 3 },
        addPartner: "xuexi", achievement: "搭子文化" },
      { label: "B", text: "观望，万一是卖网课的", effects: { study: 2 } },
      { label: "C", text: '"我一个人学效率更高"', effects: { study: 3, sanity: -3 } },
    ]
  },

  {
    id: "find_fan",
    title: "食堂的邂逅",
    weight: 0.8,
    cond: (p) => !p.partners.includes("fan") && p.partners.length < 2,
    desc: `大学食堂 12 点，你端着餐盘找座位。

对面坐着一个同样在看《申论 100 题》的男生/女生。

他抬头问你：<em>"这是第几遍了？"</em>

你说："第三遍。"

他笑了："我第五遍。"`,
    choices: [
      { label: "A", text: "加个微信吧", effects: { mood: 8, relation: 3 },
        addPartner: "fan", achievement: "饭搭子成立" },
      { label: "B", text: "继续吃饭，不说话", effects: { study: 2 } },
      { label: "C", text: '"第五遍了还没上岸？"（内涵）', effects: { mood: 3, relation: -5 } },
    ]
  },

  {
    id: "find_yanyou",
    title: "图书馆的暧昧",
    weight: 0.6,
    cond: (p) => !p.partners.includes("yanyou") && p.partners.length < 2 && p.mood > 50,
    desc: `图书馆老位置。

对面的他/她今天给你带了一杯豆浆。

　　"刚好买多了，给你。"

你们已经并排坐了 <em>20 多天</em>。

他/她从没主动说过话。
今天是第一次。`,
    choices: [
      { label: "A", text: "接过豆浆，笑了", effects: { mood: 12, study: -3, sanity: 5 },
        addPartner: "yanyou", achievement: "你不乘（研友变对象预备）" },
      { label: "B", text: '"谢谢，我不太喝豆浆"（假装清醒）',
        effects: { study: 5, mood: -5 } },
      { label: "C", text: '扫码转他 3 块钱', effects: { mood: -3, relation: -5 } },
    ]
  },

  // ============ 【新增事件·覆盖场景】 ============
  {
    id: "xingming_jigou",
    title: "申论老师的名言",
    weight: 0.8,
    desc: `机构老师在直播间激情开麦：

　　"同学们！你们看看现在几点了？
　　<em>别人在学习，你们在摆烂！</em>
　　上岸的都是别人！"

弹幕飘过一条：<em>"老师，你自己当年考了几次？"</em>

老师瞬间安静。然后切了镜头。`,
    choices: [
      { label: "A", text: "哈哈哈哈哈（截图发群）", effects: { mood: 15, sanity: 3 } },
      { label: "B", text: "关了直播，开始刷题", effects: { study: 10, mood: -5 } },
      { label: "C", text: "打赏了老师 50 元（斯德哥尔摩）",
        effects: { money: -2, study: 3, sanity: -5 } },
      { label: "D", text: '"对啊！我怎么在摆烂！"', effects: { study: 15, mood: -10, sanity: -5 } },
    ]
  },

  {
    id: "bixin_panic",
    title: "笔面比 5:5 的恐惧",
    weight: 0.9,
    cond: (p) => p.study > 45 && p.month >= 3,
    desc: `你查了目标岗位的公告。

<em>笔试面试 5:5 计分。</em>

也就是说——笔试再高都没用，面试是决定性的。

你看了看自己 14 年 I 人特质。
你看了看镜子里不会笑的自己。`,
    choices: [
      { label: "A", text: "报面试班 8000 元", effects: { money: -30, study: 15, mood: 5 } },
      { label: "B", text: "对着镜子练 3 小时'作为一名公职人员……'",
        effects: { study: 10, mood: -10, sanity: -5 } },
      { label: "C", text: "换个笔面比 7:3 的岗",
        effects: { study: 3, mood: 8 }, achievement: "笔面比玄学家" },
      { label: "D", text: '"别太荒谬，I人没人权是吧？"',
        effects: { mood: 10, sanity: -3 } },
    ]
  },

  {
    id: "xunkao_jihui",
    title: "巡考的诱惑",
    weight: 0.8,
    cond: (p) => p.month >= 4 && p.study > 40,
    desc: `群里有人发消息：

　　"云南省考下周，离我们 2800 公里。
　　<em>飞机来回 1200 块。</em>
　　万一进面了呢？"

你看了看行程：
　　高铁 8 小时 + 酒店 200/晚 + 吃饭 100/天 = 1800 元。

你又看了看自己钱包。`,
    choices: [
      { label: "A", text: "报！多一次机会就是多一次上岸",
        effects: { money: -15, study: -5, mood: 8, sanity: -3 }, achievement: "巡考战士" },
      { label: "B", text: "算了，本省考完再说",
        effects: { study: 3, mood: 3 } },
      { label: "C", text: '"我报 4 个省同时巡考！"',
        effects: { money: -40, study: -15, mood: 15, sanity: -15 }, achievement: "巡考团团长" },
      { label: "D", text: "研究了 3 小时攻略，最后没报",
        effects: { study: -5, mood: -5 } },
    ]
  },

  {
    id: "jiazu_hun",
    title: "家族婚宴",
    weight: 0.9,
    desc: `你表姐结婚了。

席间，她婆婆（认识的阿姨）热情地拉着你：

　　"你也老大不小了。
　　阿姨给你介绍个对象好不好？
　　<em>在银行上班的</em>，可稳定了。"

你妈在旁边不停地点头。`,
    choices: [
      { label: "A", text: '"我还没上岸呢……"（真实）', effects: { mood: -8, relation: 5 } },
      { label: "B", text: '"我今年的目标是上岸"（装坚定）', effects: { study: 5, mood: 3 } },
      { label: "C", text: '"银行现在裁员厉害，我怕拖累人家"',
        effects: { mood: 10, relation: -8, sanity: 3 }, achievement: "阴阳大师" },
      { label: "D", text: "去敬酒，一顿猛喝",
        effects: { money: -3, mood: 10, study: -8, sanity: -5 } },
    ]
  },

  {
    id: "zifei_kunjing",
    title: "钱包告急",
    weight: 1,
    cond: (p) => p.money < 25,
    desc: `你打开手机银行。

余额：<em>¥ 2,367.50</em>。

这个月还要：房租 1800，吃饭 800，教材 400……

你妈问你："要不要打点钱给你？"`,
    choices: [
      { label: "A", text: '"不用，我自己有"（硬撑）',
        effects: { money: -5, mood: -8, sanity: -5 } },
      { label: "B", text: '"妈，打 3000 吧"（低头）',
        effects: { money: 30, mood: -5, relation: -3, sanity: -5 } },
      { label: "C", text: "接了个周末兼职（发传单）",
        effects: { money: 8, study: -8, mood: -5 } },
      { label: "D", text: "咸鱼卖《申论 100 题》",
        effects: { money: 2, study: -10, mood: 5 } },
    ]
  },

  {
    id: "tiaojianxiao",
    title: "体检协调小组",
    weight: 0.6,
    cond: (p) => p.study > 65 && p.month >= 5,
    desc: `你收到体检通知。

你前天熬夜到 4 点复习。

你照了镜子——<em>黑眼圈深得像没洗脸</em>。
你血压不知道会不会高。
你转氨酶可能也超标。`,
    choices: [
      { label: "A", text: "立刻喝枸杞泡水+连续早睡 3 天",
        effects: { study: -5, mood: 5, sanity: 3 } },
      { label: "B", text: '"我这身体能考上就已经是奇迹"（躺）',
        effects: { mood: 3, sanity: -3 } },
      { label: "C", text: "去医院开了份提前检查报告",
        effects: { money: -5, mood: 8, sanity: 3 } },
      { label: "D", text: "在小红书搜'体检前不能做什么'",
        effects: { study: -3, mood: -5, sanity: -3 } },
    ]
  },

  {
    id: "zhengzhi_xuexi",
    title: "政治理论之夜",
    weight: 0.9,
    desc: `你打开"政治理论"单元。

第一页：<em>社会主义核心价值观是什么？</em>

你想了想——

富强、民主、文明……然后呢？

你又想了 5 分钟。

你决定打开手机查一下。

结果手机刷到了《黑神话：悟空》攻略，3 小时后你才放下手机。`,
    choices: [
      { label: "A", text: "强行拉回来继续背", effects: { study: 10, mood: -10, sanity: -5 } },
      { label: "B", text: '"24 个字呢，记住 12 个就够了吧"',
        effects: { study: 3, mood: 3 }, achievement: "战略性放弃" },
      { label: "C", text: "编个记忆口诀", effects: { study: 8, mood: 5 } },
      { label: "D", text: "听着申论ASMR直接睡了",
        effects: { study: 5, mood: 8, sanity: 5 } },
    ]
  },

  {
    id: "xiexiu_trick",
    title: "邪修·食堂大妈的言语理解",
    weight: 1,
    cond: (p) => p.path === "xiexiu",
    desc: `今天食堂大妈对你说：

　　"小伙子，<em>你这饭量可不一般啊</em>。"

作为邪修派考生，你立刻开始分析：

A. 她夸我吃得多身体好
B. 她阴阳我食量大赶紧走
C. 她提醒我吃得太慢占位子
D. 她在暗示我多吃饭对学习好

这不就是<em>言语理解</em>的最佳练习场吗？`,
    choices: [
      { label: "A", text: '"阿姨你真会夸人！"（选A）',
        effects: { study: 8, mood: 10 }, achievement: "邪修出关" },
      { label: "B", text: "选 B，低头快速吃完走人",
        effects: { study: 5, mood: -5 } },
      { label: "C", text: "选 C，默默挪位置",
        effects: { study: 3, mood: 3 } },
      { label: "D", text: '"阿姨，再来一碗！"（选D）',
        effects: { money: -1, study: 10, mood: 15 }, achievement: "邪修大师" },
    ]
  },

  {
    id: "zhengtong_pain",
    title: "正统派·五年真题的诅咒",
    weight: 1,
    cond: (p) => p.path === "zhengtong",
    desc: `你打开第 <em>17</em> 次翻开的《五年真题》。

书角已经卷得像秋天的落叶。
错题本已经换了 <em>4 本</em>。
你闭着眼睛都能背出 2023 年副省级行测第 37 题。

但你昨天的模考分数还是 <em>52</em>。`,
    choices: [
      { label: "A", text: "刷第 18 遍！熟能生巧！", effects: { study: 10, mood: -10, sanity: -8 } },
      { label: "B", text: "开始怀疑自己是不是学错方法了",
        effects: { mood: -5, sanity: -3, study: 3 } },
      { label: "C", text: "摔书，去邪修派群里偷师",
        effects: { mood: 10, study: 5, sanity: 5 } },
      { label: "D", text: '"粉笔刷到吐，答案全对不上，这题库有问题吧？"',
        effects: { mood: 8, study: -3, sanity: 3 } },
    ]
  },

  {
    id: "chunjie_zhuimen",
    title: "春节·灵魂拷问大赏",
    weight: 1.2,
    cond: (p) => p.month === 2 || p.month === 1,
    desc: `你已经躲在卫生间 <em>半小时</em>了。

大年初二，你家来了 9 个亲戚。

每个人问的问题都一样：

　　"考上了吗？"
　　"有对象吗？"
　　"一个月赚多少？"

你打开手机，想看会新闻逃避。

首页推送：<em>"国考最终招录名单公布，你的那个岗位 1:842。"</em>`,
    choices: [
      { label: "A", text: "深呼吸，出去挨个回答",
        effects: { mood: -15, relation: 8, sanity: -10 } },
      { label: "B", text: "继续躲 2 小时", effects: { mood: 5, relation: -10 } },
      { label: "C", text: '把新闻截图发家族群："喂各位看看"',
        effects: { mood: 15, relation: -15 }, achievement: "显眼包" },
      { label: "D", text: "装病躲过（说急性肠胃炎）",
        effects: { mood: 3, relation: -3, sanity: -5 } },
    ]
  },

  {
    id: "penyou_shangan",
    title: "朋友圈大型上岸现场",
    weight: 1,
    desc: `你刷到朋友圈。

一张配图：<em>《录用公示通知》</em>
底下文案："路虽远，行则将至。"
配乐：《平凡之路》。

点赞 146 条。

第一条评论是你妈：<em>"真棒！"</em>

这是你大学室友。他去年才开始备考。`,
    choices: [
      { label: "A", text: "点赞+评论：'恭喜老弟！'", effects: { mood: -10, relation: 5 } },
      { label: "B", text: "默默关掉朋友圈，继续刷题", effects: { study: 10, mood: -15 } },
      { label: "C", text: "屏蔽他", effects: { mood: 8, relation: -5, sanity: 3 } },
      { label: "D", text: '发一条自己的朋友圈："我也努力中！"（含蓄较劲）',
        effects: { mood: 5, study: -5, sanity: -3 } },
    ]
  },

  {
    id: "xingqiliu_fafeng",
    title: "周六下午的精神崩溃",
    weight: 1,
    cond: (p) => p.sanity < 40,
    desc: `周六下午 3 点。

你在自习室已经坐了 <em>5 小时</em>。

你突然站起来——

你感觉自己的脑子<em>被抽空了</em>。

你想哭，但哭不出来。
你想笑，但笑容很奇怪。

你可能需要出去走走。`,
    choices: [
      { label: "A", text: "出门走 1 小时", effects: { mood: 15, sanity: 10, study: -3 } },
      { label: "B", text: "点了个 58 块的火锅外卖（报复性消费）",
        effects: { money: -5, mood: 20, sanity: 5, study: -5 } },
      { label: "C", text: "发疯文学写 500 字（小红书小号）",
        effects: { mood: 15, sanity: 12 }, achievement: "淡淡地疯了" },
      { label: "D", text: "强行继续学，喝了 3 杯咖啡",
        effects: { money: -2, study: 5, mood: -10, sanity: -10 } },
    ]
  },

  {
    id: "xiangyin_diaoyu",
    title: "相亲前夜",
    weight: 0.8,
    cond: (p) => p.month >= 6 && p.relation > 40,
    desc: `你妈给你安排了一个相亲。

对象条件：
　　<em>28 岁，老师，有编制。</em>
　　身高 1.65，温柔不吵架。

你妈说："你要是今年还不上岸，就先把这事定了。"

明天早上 10 点，你要去你家附近的咖啡厅。`,
    choices: [
      { label: "A", text: "去，认真打扮",
        effects: { money: -3, mood: 8, relation: 10, study: -5 } },
      { label: "B", text: "去，但穿睡衣（反抗）",
        effects: { mood: 10, relation: -10 }, achievement: "显眼包" },
      { label: "C", text: "临时装病取消", effects: { mood: -5, relation: -10 } },
      { label: "D", text: '"妈，等我上岸再说。"（硬气）',
        effects: { study: 8, mood: 5, relation: -8 } },
    ]
  },

  {
    id: "mianshi_day",
    title: "面试日",
    weight: 1.1,
    cond: (p) => p.study > 55 && p.month >= 4,
    desc: `面试考场门口。

你穿着新买的西装，领带歪了又正了 <em>8 次</em>。

考官三人——
　　中间的主考官戴眼镜，看起来很严厉。
　　左边的笑眯眯。
　　右边的在看手机。

你深呼吸。

进门。敬礼。坐下。

第一题：<em>"谈谈你为什么想考公务员？"</em>`,
    choices: [
      { label: "A", text: '"为人民服务，实现自我价值……"（标准答案）',
        effects: { study: 10, mood: 3 } },
      { label: "B", text: '"因为我爸我妈我姑我姑父都让我考。"（真话）',
        effects: { mood: 15, study: -8 }, achievement: "真话哥" },
      { label: "C", text: '"我觉得编制能给我一种稳定感。"',
        effects: { study: 5, mood: 5 } },
      { label: "D", text: `"因为我不想再被 HR 问'你的职业规划是什么'了。"`,
        effects: { mood: 10, study: 3, sanity: 3 } },
    ]
  },

  {
    id: "jinmian",
    title: "进面通知",
    weight: 1,
    cond: (p) => p.month >= 4 && p.study > 55,
    desc: `你的手机响了。陌生号码。

　　"请问是 XXX 吗？
　　这里是 XX 市人事考试中心。
　　<em>恭喜你通过笔试，进入面试环节。</em>"

你的手在抖。
你查了自己的排名：<em>第 3 名</em>。
这个岗位进面的有 3 个人。`,
    choices: [
      { label: "A", text: '"这次不一样！" 立刻报 8000 元面试班',
        effects: { money: -30, study: 20, mood: 10, sanity: -5 } },
      { label: "B", text: '"又是第三名……" 研究起了笔面比',
        effects: { study: 15, mood: -5, sanity: -8 }, achievement: "笔面比玄学家" },
      { label: "C", text: '"质疑范进、理解范进、超越范进！"',
        effects: { mood: 20, sanity: -10 }, achievement: "范进附体" },
      { label: "D", text: "打电话给妈：'妈，我进面了！'",
        effects: { mood: 15, relation: 15 } },
    ]
  },

  {
    id: "luozi",
    title: "裸辞冲刺？",
    weight: 0.9,
    cond: (p) => p.identity === "35plus" || (p.month >= 8 && p.study < 50),
    desc: `部门来了个 00 后实习生。

第一天就在工位上刷《申论 100 题》。

你看了看自己密密麻麻的排期表，再看看公司门口写着"奋斗者协议"的标语。

你的手机推送：<em>"国考还有 67 天。"</em>`,
    choices: [
      { label: "A", text: "裸辞！ALL IN 备考！",
        effects: { money: -20, study: 30, mood: 15, sanity: -10 }, achievement: "裸辞战士" },
      { label: "B", text: "边工边考，人在曹营心在汉",
        effects: { study: 5, mood: -10, sanity: -8 } },
      { label: "C", text: '学那个 00 后"工位坐禅"',
        effects: { study: 10, mood: 3, relation: -3 }, achievement: "工位坐禅" },
      { label: "D", text: "把奋斗者协议撕了，拍照发朋友圈",
        effects: { mood: 30, relation: -10, money: -10, sanity: 15 }, achievement: "显眼包" },
    ]
  },

  // ============ AI彩蛋事件（占位，AI生成时替换） ============
  {
    id: "ai_placeholder",
    title: "[AI 生成事件]",
    weight: 0.01,
    cond: (p) => false,
    desc: `（等待 AI 生成）`,
    choices: [
      { label: "A", text: "...", effects: {} }
    ]
  },

  // ============ v0.5 新增事件：稀有度分级引擎 ============
  // 稀有度: common(普通) | rare(稀有) | epic(史诗) | legendary(传说)
  // rarityWeight: 0.1-10，数值越大越常见

  // ---- 传说级（极稀有+高传播） ----
  {
    id: "fanfan_lottery",
    title: "范进附体·彩票时刻",
    rarity: "legendary",
    rarityWeight: 0.1,
    cond: (p) => p.monthsPlayed >= 3 && Math.random() < 0.1,
    desc: `你在 B 站刷到一个视频：
<em>"一个考公很多年的男人，终于上岸了。"</em>

视频里他站在政务大厅门口，举着录取通知书，
笑得像个孩子。

你反复看了 4 遍。
他跌入泥塘那段，你没划走。

——你突然想哭。

不是因为你嫉妒他。
而是因为他替你活了一遍你不敢想的人生。

你把视频存到收藏夹，命名为《素材》。
凌晨 3 点 41 分，你打开题库。`,
    choices: [
      { label: "A", text: '"去他妈的，再考一年"（咬牙加课）',
        effects: { study: 15, mood: -5, sanity: -10, money: -5 },
        achievement: "范进附体", tagEvent: "fanfan_awaken" },
      { label: "B", text: "转发给爸妈，配文：'我也会的'",
        effects: { mood: 10, relation: 8, sanity: 5 },
        tagEvent: "fanfan_awaken" },
      { label: "C", text: "默默关掉视频，关掉手机，关灯睡觉",
        effects: { sanity: 15, mood: -3 },
        achievement: "我想开了" },
    ]
  },

  {
    id: "ghost_interview",
    title: "面试当天的灵异事件",
    rarity: "legendary",
    rarityWeight: 0.15,
    cond: (p) => p.monthsPlayed >= 5,
    desc: `你是今天第 17 号考生。

上一位考生出来时脸色惨白，
对你说了一句莫名其妙的话：
<em>"第 17 号……别被自己的影子吓到。"</em>

你推门进去——

主考官一共有 7 个。
但你数了 8 把椅子。
多出来那把椅子上，
坐着一个你认识的人——
<em>是你昨晚梦里的自己。</em>

他对你点了点头。`,
    choices: [
      { label: "A", text: '"谢谢前辈指点"（淡定作答）',
        effects: { mood: 5, sanity: -8, study: 8 },
        achievement: "我不怕" },
      { label: "B", text: "假装没看见，按部就班答完",
        effects: { sanity: 3, study: 5 } },
      { label: "C", text: '"老师，您的椅子好像没摆正"（阴阳怪气）',
        effects: { mood: 20, sanity: 5, relation: -5 },
        achievement: "阴阳大师" },
    ]
  },

  // ---- 史诗级（稀有+情绪浓烈） ----
  {
    id: "father_message",
    title: "爸的消息",
    rarity: "epic",
    rarityWeight: 0.3,
    cond: (p) => p.monthsPlayed >= 2 && p.relation < 70,
    desc: `凌晨 1 点 23 分。
你已经刷了 4 套行测，眼睛快瞎了。

手机震了一下。

是你爸。
一年没主动发过消息的那种。

<em>"睡了没？爸今天去县医院体检，心脏有点小问题。
没事，就跟你说一声。"</em>

你想起上次见面还是过年。
他站在门口的样子，你都快记不清了。`,
    choices: [
      { label: "A", text: '立刻打电话回去——"我现在就买票"',
        effects: { money: -25, mood: 15, relation: 25, study: -10 },
        achievement: "你不是一个人在考公" },
      { label: "B", text: '"爸，我这几天在冲刺国考，等考完我回去"',
        effects: { mood: -8, relation: -5, study: 5 } },
      { label: "C", text: "不回消息。明天 4 点半起床，模考在 5 点。",
        effects: { study: 10, mood: -15, relation: -15, sanity: -5 },
        achievement: "假考生" },
    ]
  },

  {
    id: "expired_signing",
    title: "协议班退费现场",
    rarity: "epic",
    rarityWeight: 0.4,
    cond: (p) => p.money < 50 && p.monthsPlayed >= 3,
    desc: `机构退费群炸了。

"@所有人 退费请于本周五前携带原始合同、身份证、缴费凭证，
到 XX 路 XX 楼 XX 室办理。"

但群里同时流传着另一张截图：
<em>"该机构已被列入经营异常名录，法定代表人限制高消费。"</em>

你算了一下：
协议费 19800，上岸才退。3 年了。
银行卡里还剩 47 块。`,
    choices: [
      { label: "A", text: "去现场！必须当面要说法！",
        effects: { sanity: -10, relation: 5, money: 10, mood: -5 },
        achievement: "大冤种" },
      { label: "B", text: "和群里 200 个人一起走集体诉讼",
        effects: { money: 5, sanity: 5, relation: 15, study: -5 } },
      { label: "C", text: '"算了，就当交了一笔研学费"（关掉手机）',
        effects: { mood: -5, sanity: 8 },
        achievement: "19800 买了个教训" },
    ]
  },

  // ---- 稀有级（少见+塑造性格） ----
  {
    id: "taoli_jianghu",
    title: "桃李江湖",
    rarity: "rare",
    rarityWeight: 0.7,
    cond: (p) => p.monthsPlayed >= 4 && p.relation > 30,
    desc: `你同学考上 3 年了。
昨天他朋友圈发了条新动态：
<em>"今天组织召开第 36 次业务推进会……"</em>

你看了看自己桌上堆着的
3 套没刷完的真题、5 罐红牛、2 包榨菜。

他请你吃饭，席间：
<em>"兄弟，要不要我帮你问问我们单位还有没有合同工的坑？"</em>

你笑了一下，说不用了。
但回家的地铁上，你想了 40 分钟。`,
    choices: [
      { label: "A", text: '"好啊，能先内推吗？"（曲线救国）',
        effects: { money: 10, mood: 5, study: -5, relation: 5 },
        tagEvent: "internal_refer" },
      { label: "B", text: "婉拒，回家把模考卷做完",
        effects: { study: 8, mood: -3, sanity: 5 },
        achievement: "我卷故我在" },
      { label: "C", text: '"你们单位食堂一顿饭多少钱？真羡慕"（苦笑）',
        effects: { mood: -5, sanity: 5, relation: 3 } },
    ]
  },

  {
    id: "rural_grandma",
    title: "外婆的菜园",
    rarity: "rare",
    rarityWeight: 0.5,
    cond: (p) => p.month >= 5 && p.month <= 7,
    desc: `外婆打电话让你回家吃饭。

你说在备考。
她说：<em>"考什么公，出来吃西瓜，今年瓜甜。"</em>

你说：<em>"外婆，我真的要考。"</em>

她在电话那头沉默了很久。

然后她轻轻说了一句：
<em>"你爸今天又喝多了，说你再考不上，就别回来了。
我骂他了。你别信。"</em>

你挂了电话。
桌角那包没拆的红南京已经空了三天。`,
    choices: [
      { label: "A", text: "回家吃西瓜",
        effects: { mood: 20, sanity: 15, study: -8, relation: 10 },
        achievement: "你不是一个人在考公" },
      { label: "B", text: '电话里说："外婆，西瓜给我留着。"',
        effects: { mood: 12, sanity: 8, relation: 5 } },
      { label: "C", text: "不回家。把今天的卷子做完再说",
        effects: { study: 10, mood: -5, relation: -5, sanity: -8 } },
    ]
  },

  // ---- 普通级（常见+日常感） ----
  {
    id: "jier_saler",
    title: "节日促销诱惑",
    rarity: "common",
    rarityWeight: 2.5,
    cond: (p) => p.money < 60 && p.monthsPlayed >= 1,
    desc: `双 11 / 618 / 考公图书节……
你打开抖音，"全场 5 折"、"冲刺卷买一送一"的红点疯狂闪烁。

购物车里躺着：
- 粉笔行测 5000 题（已加购 17 天）
- 中公冲刺密卷（已加购 17 天）
- 一包咖啡（已加购 17 天）

你默默清空购物车。
你点进"考公人互助群"：
<em>"兄弟们，借一套用用，二手的就行。"</em>`,
    choices: [
      { label: "A", text: "咬牙下单（花 88 块，复习 +5）",
        effects: { money: -10, study: 5, mood: 5 } },
      { label: "B", text: "去拼多多买盗版（穷人智慧）",
        effects: { money: -3, study: 3, mood: 2, sanity: -2 } },
      { label: "C", text: "找考友借（真·考公搭子）",
        effects: { relation: 8, study: 2, mood: 3 } },
    ]
  },

  {
    id: "sister_mock",
    title: "表妹的模考邀请",
    rarity: "common",
    rarityWeight: 1.8,
    cond: (p) => p.study > 30 && p.monthsPlayed >= 2,
    desc: `你表妹今年大三，也要考公。
她给你发了个链接：
<em>"哥，我组了个线上模考局，要不要一起？"</em>

你点开她成绩单：
行测 61，申论 64。

你看了看你上次的模考：
行测 52，申论 49。

她追加了一条：
<em>"哥，我看你发的朋友圈，感觉你压力好大。
实在不行就……工作嘛，也不是只有公务员。"</em>`,
    choices: [
      { label: "A", text: "去！被表妹超了多没面子",
        effects: { study: 8, mood: -3, sanity: -3 } },
      { label: "B", text: '婉拒——"我自己刷题就行"',
        effects: { mood: 3, sanity: 2 } },
      { label: "C", text: '把表妹的微信设成"仅聊天"',
        effects: { mood: -5, sanity: 3, relation: -5 },
        achievement: "我不要你管" },
    ]
  },

  // ---- P0 内容补强：失眠 + 考完 ----
  {
    id: "insomnia_clock",
    title: "凌晨三点的天花板",
    rarity: "rare",
    rarityWeight: 0.6,
    cond: (p) => p.monthsPlayed >= 2 && p.sanity < 60,
    desc: `凌晨 3 点 14 分。

你已经数了 287 只羊。
天花板上的水渍像一只猪。
——你决定明天就考公上岸，养真的猪。

手机屏幕亮了。
初中同学群有人发：
<em>"兄弟们都睡了吧？我也睡不着，刚拿到字节 offer 了，纠结要不要去。"</em>

11 个人秒回"恭喜"。

你把群设成了免打扰。
然后盯着"3:14"看了 8 分钟。

……数字没动。`,
    choices: [
      { label: "A", text: "打开题库，做一套资料分析",
        effects: { study: 8, sanity: -8, mood: 3 },
        achievement: "越夜越清醒" },
      { label: "B", text: "打开朋友圈，给 5 个上岸的人挨个点赞",
        effects: { mood: -10, sanity: -5, relation: 3 },
        achievement: "电子哭丧" },
      { label: "C", text: '起床给妈妈发了条微信：\'妈，我没事\'',
        effects: { sanity: 10, relation: 8, mood: 5 },
        achievement: "报喜不报忧" }
    ]
  },

  {
    id: "after_exam",
    title: "铃响的那一秒",
    rarity: "epic",
    rarityWeight: 0.4,
    cond: (p) => p.monthsPlayed >= 6,
    desc: `监考老师举起了手。

你看着答题卡上最后一道资料分析——
<em>第三问，根号下 117.64，你算了 5 分钟，没算出来。</em>

"叮——"

所有人同时停笔。
那种声音，你练了 6 套真题都没听过。

你走出考场。
阳光特别好。

你妈在门口等你，手里拿着一瓶矿泉水，
<em>"考得怎么样？"</em>

你笑了一下：<em>"还行。"</em>

回家的出租车上，你刷了刷手机。
申论题目上了热搜。
<em>第三问你确实算错了。</em>

你把手机递给旁边的陌生人：
<em>"师傅，麻烦您开快点。我要回去对答案。"</em>

师傅从后视镜看了你一眼：
<em>"小伙子，今年考不上明年还能考。别哭。"</em>

……你才发现自己已经在哭。`,
    choices: [
      { label: "A", text: '"师傅，我不考了。"（下车走路回家）',
        effects: { sanity: 15, mood: -10, study: -20 },
        achievement: "我想开了" },
      { label: "B", text: '"明年……明年我还要来。"（擦干眼泪看下一年的岗位表）',
        effects: { study: 20, mood: -5, sanity: -5, relation: 5 },
        achievement: "再来一年" },
      { label: "C", text: '"我妈在前面下车等我，我去接她。"（抱了抱她）',
        effects: { mood: 20, relation: 20, sanity: 10, study: -5 },
        achievement: "你不是一个人在考公" }
    ]
  },
];

// ========== 成就库 ==========
const ACHIEVEMENTS = {
  "癞蛤蟆想吃天鹅肉": { desc: "《儒林外史》范进同款：你爸/丈人都说过这句话。" },
  "尖嘴猴腮": { desc: "'你这尖嘴猴腮，也该撒泡尿自己照照！'" },
  "我避他锋芒？": { desc: "勇士的自我安慰——你报了三不限，全员绞肉机。" },
  "揭穿话术": { desc: "王阿姨家孩子的岗位被你揭穿了。" },
  "外耗大师": { desc: "与其内耗自己，不如外耗他人。" },
  "我卷故我在": { desc: "我思，故我在。/ 我卷，故我在。" },
  "大冤种": { desc: "19800 元协议班，上岸才退。——上岸率 1%。" },
  "考公脱口秀": { desc: "把备考段子讲出来，逗笑了全场同学。" },
  "假考生": { desc: "模考 41.5 分后的哲学顿悟：我可能是个假考生。" },
  "反向内推": { desc: "凌晨 2 点向字节室友问内推——万一上不了岸。" },
  "我指定是好官": { desc: "'考试干哈，直接让我干得了！'" },
  "及时止损": { desc: "从家族群退了出来。代价：关系 -20。收益：血压 -20。" },
  "搭子文化": { desc: "找到了真正的学习搭子。" },
  "饭搭子成立": { desc: "食堂永远有一个人等着你。" },
  "你不乘（研友变对象预备）": { desc: "他今天给你带了豆浆。" },
  "笔面比玄学家": { desc: "开始研究5:5、4:6、7:3的玄学——其实不如练面试。" },
  "范进附体": { desc: "质疑范进→理解范进→超越范进。" },
  "裸辞战士": { desc: "撕下奋斗者协议的那一刻，你也撕下了工牌。" },
  "工位坐禅": { desc: "表面在上班，实则在背申论。" },
  "显眼包": { desc: "朋友圈炸裂式发言。" },
  "摆烂艺术家": { desc: "我将全职在家研究如何不学习。" },
  "噫！好了！我中了！": { desc: "（范进Lv.MAX）反复念十八遍，然后跌入泥塘。" },
  "一交跌倒": { desc: "温和版上岸——牙关咬紧，不省人事。" },
  "披头散发·满脸污泥": { desc: "上岸那一刻的你。" },
  "该死的畜生！你中了甚么？": { desc: "胡屠户一巴掌把你打醒了。" },
  "七八个轿子": { desc: "之前爱答不理的亲戚，突然都来了。" },
  "想开了": { desc: "人生不止上岸这一条路。" },
  "我想开了": { desc: "凌晨3:14，数字没动。但你想通了。" },
  "19800 买了个教训": { desc: "协议班 36800 / 上岸率 1.2%。" },
  "再来一年": { desc: "你擦了擦眼泪，打开了下一年的岗位表。" },
  "越夜越清醒": { desc: "凌晨 3 点做题的正确率，比白天高 30%。" },
  "电子哭丧": { desc: "给上岸的人挨个点赞，是另一种比较。" },
  "报喜不报忧": { desc: "'妈，我没事'——你发了 8 次。" },
  "我不要你管": { desc: "表妹的好意，也是一种压力。" },
  "蒜鸟蒜鸟": { desc: "算了算了，佛系备考。" },
  "正统学徒": { desc: "粉笔+中公+华图，传统考公路线。" },
  "邪修入门": { desc: "你选择了一条不走寻常路的备考方式。" },
  "邪修出关": { desc: "食堂大妈都成了你的言语理解陪练。" },
  "邪修大师": { desc: "再来一碗！你发现大妈在夸你饭量好。" },
  "战略性放弃": { desc: "24 个字记住 12 个就够了，剩下的蒙。" },
  "阴阳大师": { desc: "三句话让亲戚闭嘴。" },
  "真话哥": { desc: "面试说真话——有人觉得你狂，有人觉得你真。" },
  "淡淡地疯了": { desc: "发疯文学 500 字，小红书爆款预备。" },
  "巡考战士": { desc: "飞越 2800 公里去考 3 小时的试。" },
  "巡考团团长": { desc: "4 个省同时报名——要么上岸，要么破产。" },
  "AI事件参与者": { desc: "你遇到了一个由 AI 即兴生成的随机事件。" },
};

// ========== 结局库 ==========
const ENDINGS = [
  {
    id: "shangan_fengdian",
    emoji: "🎭",
    title: "噫！好了！我中了！",
    sub: "范进式上岸 · 传奇结局",
    type: "good",
    cond: (p) => p.study >= 70 && p.mood > 85 && p.sanity < 50,
    narrative: `你接到人事局的电话。你挂了电话。

你的手在抖。

你冲出门，对着路人喊：<em>"噫！好了！我中了！"</em>

你跑过街角。你跌入了一个水坑——披头散发，满脸污泥，一只鞋跑丢了。

路人围过来看你，像看一个疯子。

你妈赶来，狠狠掐了你一把：<em>"该死的畜生！你中了甚么？"</em>

你突然醒了。

过了一周，之前不怎么理你的二姑、三舅、表姑父，陆陆续续发来信息——

　　"二姑说她早就知道你能行。"

范进在三百年前就写好了你的剧本。`,
    autoAchievements: ["噫！好了！我中了！", "披头散发·满脸污泥", "该死的畜生！你中了甚么？", "七八个轿子"],
  },
  {
    id: "shangan_normal",
    emoji: "🏆",
    title: "一战上岸",
    sub: "省会机关 · 正统结局",
    type: "good",
    cond: (p) => p.study >= 70 && p.sanity >= 50,
    narrative: `你上岸了。

省会城市，市直机关，正科级后备。

入职那天你穿了一身新西装。
你爸把你送到单位门口，一路上没说话，到了门口才说：

　　"好好干。"

你妈当晚在家族群发了一张你上班第一天的照片。
群里 28 个亲戚，点了 26 个赞，剩下 2 个是二姑和三舅——他们只回复了"👏"。

晚上你躺在床上，翻开一个久违的 app——

你取消关注了 37 个公考博主。`,
  },
  {
    id: "xiancheng",
    emoji: "🏠",
    title: "上岸但去了县城",
    sub: "降维打击 · 真实反差",
    type: "good",
    cond: (p) => p.study >= 55 && p.relation >= 50,
    narrative: `你上岸了。

你妈激动地哭了。

你爸开了瓶茅台（珍藏了 10 年的那瓶）。

你坐在家里的沙发上，打开自己的岗位信息——

　　<em>XX 县 XX 镇人民政府 · 综合办</em>

距离最近的地铁站：<em>180 公里</em>。
距离最近的星巴克：<em>65 公里</em>。

但你爸妈觉得——这就是他们能想到的最好的结局了。

晚上你把"北京"两个字从朋友圈城市里删了。`,
  },
  {
    id: "erzhan",
    emoji: "⚔️",
    title: "二战准备中",
    sub: "肝帝结局 · 再战一年",
    type: "weird",
    cond: (p) => p.study >= 60 && p.mood <= 40,
    narrative: `出结果那天，你在楼下便利店门口站了很久。

你的面试分数差了 <em>0.4 分</em>。

你把打印的岗位表撕了，又捡起来。
你在便利店买了一瓶啤酒，喝了一半，又把剩下的倒了。

你发了条朋友圈：

　　"生活就是：明明都看到岸了，却被一个浪推回来。
　　继续游吧。"

三天后，你开始研究 2026 年的国考大纲。

你打开了一个新的笔记本，第一页写着：<em>"二战，从今天开始。"</em>`,
  },
  {
    id: "bengkui",
    emoji: "💔",
    title: "三战崩溃",
    sub: "心态结局 · 精神状态归零",
    type: "bad",
    cond: (p) => p.sanity <= 20,
    narrative: `今天是你第三次查成绩。

行测：38 分。

你笑了。你笑得停不下来。

你打开冰箱，里面只有一瓶快过期的老干妈。

你妈打电话来，你没接。
你爸发微信："妈做了饭，回来吃。" 你没回。

<em>你不知道自己是谁了。</em>

晚上你在阳台站了很久。
你看着楼下的人——他们看起来都有地方可以去。

第二天你去医院挂了心理科。
医生问你：<em>"最近睡眠怎么样？"</em>

你说："医生，你觉得 38 分算考公人吗？"`,
  },
  {
    id: "pokuang",
    emoji: "🛌",
    title: "全润了",
    sub: "躺平结局 · 放弃备考",
    type: "weird",
    cond: (p) => p.mood >= 80 && p.study <= 40,
    narrative: `你删了粉笔 APP。

你删了中公 APP。

你删了所有公考博主的关注。

你把《申论 100 题》挂到了闲鱼——9.9 包邮。

第二天你买了张去大理的单程票。

你妈打来电话：<em>"你什么时候回来备考？"</em>

你说：<em>"妈，我发现上岸不是我人生的唯一解。"</em>

你妈沉默了 10 秒。
然后说：<em>"你是不是被传销洗脑了？"</em>

你笑了。

（解锁隐藏成就：想开了）`,
    autoAchievements: ["想开了"],
  },
  {
    id: "zhuanhang",
    emoji: "💼",
    title: "考公失败进了大厂",
    sub: "反向结局 · 赛道漂移",
    type: "weird",
    cond: (p) => true,
    narrative: `省考出分那天，你查了分数：<em>45.6</em>。
你没进面。

你室友恰好内推你去了字节。

三个月后你成为了某业务线的核心成员，月薪 <em>2.5 万</em>。

半年后你被"优化"了。

一年后你又开始备考公务员。

你爸说："你看，我早就说过，只有编制是铁的。"

你点了点头。

<em>你又打开了粉笔 APP。</em>`,
  },
  {
    id: "dazhuan",
    emoji: "🎓",
    title: "考公转大专",
    sub: "世界上本没有路 · 走的人多了也就成了路",
    type: "weird",
    cond: (p) => p.sanity >= 70 && p.study < 40,
    narrative: `你在小红书刷到一个帖子：

　　"26岁，考公 3 年失败，我选择去读大专。"

你点进去，作者写道：

　　"我研究了一下，大专有定向培养公务员计划。
　　我决定重新参加高考，读一个定向大专。
　　三年后毕业，直接进编。"

你看了很久。

你突然笑了。

<em>恭喜你找到了真正的赛道！</em>

（世界上本没有路，走的人多了，也就成了路。）`,
  },
];

const DEFAULT_ENDING = {
  emoji: "🌀",
  title: "未完待续",
  sub: "今年暂告一段落",
  type: "weird",
  narrative: `12 个月过去了。

你没上岸。

你也没完全崩溃。

你站在窗前，想了很久——

你不知道自己是否还要继续。

你妈问你："明年还考吗？"

你说：<em>"让我再想想。"</em>`,
};
