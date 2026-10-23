/* ============================================================
   赛证通 · 数据层 v2
   新增：主办分类 hostType / 官网报名链接 applyUrl
        报名材料清单 materials / 现场图 scenePhotos / 作品图 photos
        学校扩充 + 通知适配专业 typeCat+majors / 用户搜索池 users
   说明：赛事时间基于真实赛程规律编排，用于功能演示；
        参赛规模 / 作品 / 图片为演示素材。
   ============================================================ */

const DB = {};

/* ---------- 专业分类 ---------- */
DB.majorList = ["不限专业", "计算机", "外语", "经管", "电子信息", "机电", "数理", "艺术传媒", "文法教育", "医学", "综合类"];

/* ---------- 主办性质分类（首页二级细分） ---------- */
DB.hostTypes = {
  comp: [
    { key: "all", label: "全部" },
    { key: "national", label: "国家级" },
    { key: "intl", label: "国际级" },
    { key: "province", label: "省办" },
    { key: "union", label: "校际联合" },
    { key: "enterprise", label: "企业办" },
    { key: "school", label: "校级" }
  ],
  exam: [
    { key: "all", label: "全部" },
    { key: "cert-national", label: "国家级认证" },
    { key: "cert-intl", label: "国际认证" },
    { key: "cert-industry", label: "行业认证" },
    { key: "cert-prov", label: "省级统考" },
    { key: "cert-school", label: "校级批次" }
  ]
};

/* ---------- 赛事与考试 ---------- */
DB.events = [

  /* ============ 竞赛 ============ */
  {
    id: "c01", kind: "comp", hostType: "national",
    name: "第十八届蓝桥杯全国软件和信息技术专业人才大赛", short: "蓝桥杯",
    level: "国家级", organizer: "工业和信息化部人才交流中心",
    applyUrl: "https://www.lanqiao.cn/contest/",
    category: "计算机", majors: ["计算机", "电子信息", "数理", "综合类"],
    signStart: "2026-10-10", signEnd: "2026-11-05", eventDate: "2027-04-12", eventYear: 2027,
    intro: "蓝桥杯大赛是国内领先的信息技术赛事，涵盖软件类（C/C++、Java、Python、Web）、电子类（嵌入式、单片机）等多个赛道。省赛获奖者可晋级全国总决赛，是计算机相关专业学生积累项目经验、提升就业竞争力的首选赛事。软件类个人赛全程机试，参赛者需在规定时间内完成算法与程序设计题目，成绩按比例划分一、二、三等奖。",
    ruleChange: "第十八届起新增「人工智能应用」赛道，允许以小组形式提交大模型应用作品；省赛获奖比例由不超过5%调整为不超过8%的调整方案正在征求意见，请关注官网通知。",
    materials: [
      { name: "参赛报名信息表", desc: "含个人基本信息、报考赛道（软件/电子类）、组别（大学组/研究生组），需院校盖章确认。", sample: "蓝桥杯报名样表" },
      { name: "在读证明 / 学生证扫描件", desc: "证明在校生身份，用于核验组别资格。" },
      { name: "1寸电子证件照", desc: "白底免冠，用于制作准考证。" },
      { name: "报名费缴费凭证", desc: "省赛报名费 300 元/科目，院校统一组织可报销。" },
      { name: "高校报名汇总表", desc: "校内统一报名时由负责老师汇总提交。" }
    ],
    scenePhotos: ["img/scene-lab.jpg", "img/works-cert.jpg"],
    past: [
      { year: 2025, scale: "全国参赛人数约 16.5 万人", award: "省一约5%、省二约20%、省三约25%", note: "软件类设 C/C++、Java、Python、Web 四组" },
      { year: 2024, scale: "全国参赛人数约 15.2 万人", award: "省赛获奖率约 30%", note: "新增研究生组别" }
    ],
    works: [
      { year: 2025, title: "基于强化学习的校园共享单车调度系统", desc: "利用 Q-Learning 对投放点进行动态调度仿真，降低 18% 的空置率，获评省赛优秀作品并在国赛 Web 赛道获二等奖。", award: "国赛二等奖", photos: ["img/works-model.jpg", "img/scene-lab.jpg"] },
      { year: 2024, title: "森林火灾早期识别与预警平台", desc: "以轻量化 YOLO 模型结合无人机巡检影像，实现烟雾早期识别，平均响应时间 1.2 秒。", award: "国赛一等奖", photos: ["img/works-team.jpg", "img/works-cert.jpg"] }
    ],
    hot: true, tags: ["算法", "程序设计", "软件开发"]
  },
  {
    id: "c02", kind: "comp", hostType: "intl",
    name: "ACM-ICPC 国际大学生程序设计竞赛（2026 亚洲区域赛）", short: "ICPC",
    level: "国际级", organizer: "国际计算机学会（ACM）",
    applyUrl: "https://icpc.global/",
    category: "计算机", majors: ["计算机", "数理"],
    signStart: "2026-08-01", signEnd: "2026-10-25", eventDate: "2026-11-15", eventYear: 2026,
    intro: "ICPC 是全球最具影响力的大学生程序设计竞赛，被誉为「程序设计的奥林匹克」。每队 3 名选手共用 1 台计算机，在 5 小时内解决 10-13 道算法题目，以过题数与罚时排名。亚洲区域赛金、银、铜奖队伍将有机会晋级世界总决赛。",
    ruleChange: "2026 赛季起新增「算法竞技场」线上资格赛通道，未获线下名额的队伍可通过线上赛争取区域赛外卡。",
    materials: [
      { name: "队伍报名表", desc: "登记 3 名队员信息与教练（指导老师）信息，教练须为在校教师。" },
      { name: "在读证明（全体队员）", desc: "注册系统导出或教务处开具。" },
      { name: "教练推荐信息", desc: "含教练职称与联系方式，用于区域赛联络。" },
      { name: "区域赛名额确认函", desc: "由赛区组委会向获得线下名额的队伍发放。" }
    ],
    scenePhotos: ["img/scene-robo.jpg", "img/works-model.jpg"],
    past: [
      { year: 2025, scale: "亚洲区域赛 6 个赛区，参赛队伍约 900 队", award: "区域赛金银铜牌比例约为 10% / 30% / 60%", note: "金牌队伍可晋级 World Finals" },
      { year: 2024, scale: "亚洲区域赛参赛队伍约 850 队", award: "国内高校共 12 队晋级世界总决赛", note: "竞争强度逐年上升" }
    ],
    works: [
      { year: 2025, title: "哈工大「Apex」队区域赛解题复盘", desc: "全程 8 题压哨过 G 题，罚时 312 分钟获银牌第一名，复盘文档在社区被收藏 2000+ 次。", award: "区域赛银牌", photos: ["img/works-model.jpg"] }
    ],
    hot: true, tags: ["算法", "团队赛", "国际赛事"]
  },
  {
    id: "c03", kind: "comp", hostType: "national",
    name: "中国国际大学生创新大赛（2027，原「互联网+」）", short: "国创赛",
    level: "国家级", organizer: "教育部等部委联合主办",
    applyUrl: "https://cy.ncss.cn/",
    category: "综合类", majors: ["综合类", "经管", "计算机", "机电", "艺术传媒", "医学"],
    signStart: "2027-03-01", signEnd: "2027-04-15", eventDate: "2027-06-20", eventYear: 2027,
    intro: "中国国际大学生创新大赛由教育部等部委联合主办，是国内规格最高、规模最大的双创赛事，设高教主赛道、「青年红色筑梦之旅」赛道、职教赛道、产业命题赛道等。项目需完成商业计划书、路演答辩等环节，获奖对保研加分、落户加分均有帮助。",
    ruleChange: "2024 年起赛事由「互联网+」更名为「中国国际大学生创新大赛」，突出创新而非单纯商业属性；2027 赛季将扩大产业命题赛道比例，鼓励围绕真实企业需求攻关。",
    materials: [
      { name: "项目报名表（平台填报）", desc: "在国家大学生就业服务平台填报项目信息、赛道选择、团队分工。" },
      { name: "商业计划书", desc: "含项目背景、技术方案、商业模式、财务预测，建议 20-40 页。" },
      { name: "路演 PPT / 演示视频", desc: "路演 PPT 建议不超过 15 页；演示视频不超过 3 分钟。" },
      { name: "知识产权与佐证材料", desc: "专利、软著、检测报告、合作协议等扫描件。" },
      { name: "在读证明（全体成员）", desc: "团队成员须为在校生或毕业 5 年内校友。" }
    ],
    scenePhotos: ["img/scene-answer.jpg", "img/scene-expo.jpg", "img/works-team.jpg"],
    past: [
      { year: 2025, scale: "来自 150+ 国家和地区、5000+ 所院校，参赛项目约 514 万个", award: "全国金奖约 300 个（含赛道）", note: "高教主赛道每校限额推荐" },
      { year: 2024, scale: "参赛项目约 614 万个", award: "金奖含金量高，多数院校保研加分认可", note: "更名后首届" }
    ],
    works: [
      { year: 2025, title: "「智瞳」——电力巡检无人机集群调度系统", desc: "面向电网巡检的多机协同方案，完成 3 轮真实场景验证，获高教主赛道全国金奖。", award: "全国金奖", photos: ["img/works-team.jpg", "img/scene-expo.jpg"] },
      { year: 2024, title: "「禾光」盐碱地改良综合服务方案", desc: "红旅赛道项目，覆盖 12 万亩盐碱地，带动农户增收，获「青年红色筑梦之旅」赛道金奖。", award: "红旅赛道金奖", photos: ["img/scene-expo.jpg"] }
    ],
    hot: true, tags: ["创新创业", "路演", "保研加分"]
  },
  {
    id: "c04", kind: "comp", hostType: "national",
    name: "「挑战杯」全国大学生课外学术科技作品竞赛（第十九届）", short: "挑战杯",
    level: "国家级", organizer: "共青团中央、中国科协、教育部、全国学联",
    applyUrl: "https://www.tiaozhanbei.net/",
    category: "综合类", majors: ["综合类", "计算机", "机电", "数理", "医学", "文法教育"],
    signStart: "2026-11-15", signEnd: "2027-01-10", eventDate: "2027-10-18", eventYear: 2027,
    intro: "「挑战杯」被誉为中国大学生科技创新的「奥林匹克」，每两年一届（奇数年举办学术科技作品竞赛）。作品分自然科学类学术论文、哲学社会科学类社会调查报告、科技发明制作三大类，经校级初赛、省级复赛层层选拔，最终进行全国终审决赛。",
    ruleChange: "第十九届新增「人工智能专项赛」，鼓励围绕大模型、智能体方向提交作品；科技发明制作类鼓励提交可现场演示的实物原型。",
    materials: [
      { name: "作品申报书", desc: "按官方模板填写作品简介、创新点、应用价值，需字数控制。" },
      { name: "学术论文 / 调查报告全文", desc: "自然科学类不超过 8000 字，社科类调查报告不超过 15000 字。" },
      { name: "支撑材料合订本", desc: "实验数据、查重报告、专利证书、用户证明等。" },
      { name: "展示视频（≤2 分钟）", desc: "实物类作品必须提供可演示视频或现场演示方案。" },
      { name: "校赛推荐表", desc: "经校级初赛推荐并公示后有效。" }
    ],
    scenePhotos: ["img/scene-expo.jpg", "img/scene-answer.jpg"],
    past: [
      { year: 2025, scale: "全国 2000+ 所高校、约 30 万作品参与各级选拔", award: "国赛设特等奖、一、二、三等奖，特等奖约 50 件", note: "哈工大、清华等常年领跑团体总分" },
      { year: 2023, scale: "第十八届终审决赛作品 1255 件", award: "特等奖 44 件", note: "另设累进创新奖等专项奖" }
    ],
    works: [
      { year: 2025, title: "微纳机器人靶向给药系统", desc: "磁场驱动的微纳机器人平台，实现血管内靶向药物递送，动物实验成功率 92%，获特等奖。", award: "全国特等奖", photos: ["img/works-cert.jpg", "img/works-team.jpg"] },
      { year: 2023, title: "基于联邦学习的多方安全数据分析平台", desc: "面向医疗数据孤岛问题的隐私计算方案，已在 3 家三甲医院试点。", award: "全国一等奖", photos: ["img/works-model.jpg"] }
    ],
    hot: true, tags: ["学术科技", "保研加分", "两年一届"]
  },
  {
    id: "c05", kind: "comp", hostType: "national",
    name: "「挑战杯」中国大学生创业计划竞赛（2026）", short: "小挑",
    level: "国家级", organizer: "共青团中央、教育部等",
    applyUrl: "https://www.tiaozhanbei.net/",
    category: "综合类", majors: ["综合类", "经管", "计算机", "艺术传媒"],
    signStart: "2026-09-01", signEnd: "2026-10-31", eventDate: "2026-11-28", eventYear: 2026,
    intro: "「小挑」聚焦创业计划与实践，偶数年举办，与「大挑」交替进行。参赛需提交完整商业计划书并进行路演，重点考察项目的创新性、商业模式可行性与团队执行力，是双创领域影响力最大的赛事之一。",
    ruleChange: "2026 届强化「创业实践」导向，已注册公司的项目单独设组评审，更看重真实运营数据。",
    materials: [
      { name: "创业计划书", desc: "完整商业计划，含股权结构、财务与融资规划。" },
      { name: "项目展示 PPT", desc: "省赛、国赛路演使用，建议含产品演示截图。" },
      { name: "营业执照（实践组）", desc: "已注册公司的项目需提供营业执照与经营数据。" },
      { name: "校赛推荐与公示材料", desc: "校级选拔后的推荐名额表。" }
    ],
    scenePhotos: ["img/scene-answer.jpg"],
    past: [
      { year: 2024, scale: "全国 2200+ 所高校参与", award: "金奖约 80 个，每省限额推荐", note: "金奖项目多数获得后续投融资" }
    ],
    works: [
      { year: 2024, title: "「冷杉科技」——低温锂电BMS系统", desc: "面向高寒地区新能源车的电池管理系统，团队注册公司后获天使轮融资 500 万，夺得全国金奖。", award: "全国金奖", photos: ["img/works-team.jpg", "img/scene-answer.jpg"] }
    ],
    hot: false, tags: ["创业", "路演", "商业计划"]
  },
  {
    id: "c06", kind: "comp", hostType: "national",
    name: "全国大学生数学建模竞赛（2026 年已办 / 2027 届筹备）", short: "数模国赛",
    level: "国家级", organizer: "中国工业与应用数学学会（CSIAM）",
    applyUrl: "https://www.mcm.edu.cn/",
    category: "数理", majors: ["数理", "计算机", "综合类", "经管"],
    signStart: "2026-06-01", signEnd: "2026-08-05", eventDate: "2026-09-11", eventYear: 2026,
    intro: "全国大学生数学建模竞赛创办于 1992 年，是全国高校规模最大的基础性学科竞赛。每队 3 人，在 72 小时（三天两夜）内就指定问题完成从建立模型、求解验证到撰写论文的全过程，考察数学能力、编程能力与协作能力。全国一等奖约 300 队，是保研、评奖学金的重要加分项。",
    ruleChange: "2026 届起允许在论文中规范引用大模型辅助生成的内容，但须附「AI 使用声明」；竞赛期间组委会将进行查重与相似度检测。",
    materials: [
      { name: "队伍报名表", desc: "登记 3 名队员与指导教师，队内不得跨校组队。" },
      { name: "承诺书", desc: "全体队员签署独立完成承诺与查重知情同意。" },
      { name: "在读证明", desc: "本科组与专科组分别核验。" },
      { name: "报名费缴费凭证", desc: "每队 300 元，由学校统一缴纳。" }
    ],
    scenePhotos: ["img/works-model.jpg", "img/scene-lab.jpg"],
    past: [
      { year: 2025, scale: "全国 1600+ 所院校、53,000+ 队（含本科组/专科组）", award: "全国一等奖约 1.2%，二等奖约 5%", note: "黑龙江赛区一等奖 28 队" },
      { year: 2024, scale: "全国参赛队伍约 49,593 队", award: "全国一等奖 289 队", note: "参赛规模逐年上涨" }
    ],
    works: [
      { year: 2025, title: "A 题「飞行器主动减振控制」优秀论文", desc: "以最优控制结合深度强化学习求解减振参数，论文被收录至《数学建模优秀论文集》，是备赛必读范文。", award: "全国一等奖", photos: ["img/works-model.jpg", "img/scene-lab.jpg"] },
      { year: 2024, title: "B 题「生产过程中的决策问题」优秀论文", desc: "经典运筹优化题解，动态规划+蒙特卡洛模拟双方法互相验证，结构清晰适合新人研读。", award: "全国一等奖", photos: ["img/works-model.jpg"] }
    ],
    hot: true, tags: ["数学建模", "72小时", "三人一队"]
  },
  {
    id: "c07", kind: "comp", hostType: "national",
    name: "全国大学生电子设计竞赛（2027 届）", short: "电赛",
    level: "国家级", organizer: "教育部、工业和信息化部",
    applyUrl: "https://nuedc.xjtu.edu.cn/",
    category: "电子信息", majors: ["电子信息", "计算机", "机电"],
    signStart: "2027-04-20", signEnd: "2027-06-10", eventDate: "2027-07-28", eventYear: 2027,
    intro: "全国大学生电子设计竞赛每两年举办一届（单数年），采用「半封闭、集中式」竞赛方式：队伍在四天三夜内完成方案设计、电路搭建、软件编程与实物调试，并撰写报告。题目涵盖电源、信号、控制、高频等方向，是电子信息类含金量最高的竞赛之一。",
    ruleChange: "2025 届起引入「自主命题邀请赛」与瑞萨电子企业专项奖，鼓励使用国产芯片平台参赛。",
    materials: [
      { name: "参赛队报名表", desc: "每队 3 人，登记分工（硬件/软件/测试）。" },
      { name: "学生证 / 在读证明", desc: "赛区资格审核用。" },
      { name: "报名费缴费凭证", desc: "每队 300 元，校内实验室统一报销。" },
      { name: "安全承诺书", desc: "竞赛期间用电与仪器使用安全承诺。" }
    ],
    scenePhotos: ["img/scene-lab.jpg", "img/scene-robo.jpg"],
    past: [
      { year: 2025, scale: "全国 1100+ 所院校、2 万余队参赛", award: "全国一等奖约 1%，二等奖约 4%", note: "单数年举办国赛" },
      { year: 2023, scale: "全国参赛队伍约 19,000 队", award: "一等奖 357 队", note: "综合测评增加实物演示环节" }
    ],
    works: [
      { year: 2025, title: "H 题「信号调制解调识别装置」满分方案", desc: "基于 FPGA 的实时频谱识别，识别准确率 99.2%，实测报告完整公开，被多校定为训练标杆。", award: "全国一等奖", photos: ["img/scene-lab.jpg", "img/works-cert.jpg"] }
    ],
    hot: false, tags: ["硬件", "四天三夜", "三人一队"]
  },
  {
    id: "c08", kind: "comp", hostType: "enterprise",
    name: "全国大学生机器人大赛 RoboMaster 2027 赛季", short: "RoboMaster",
    level: "国家级", organizer: "共青团中央、全国学联、深圳市大疆创新科技有限公司",
    applyUrl: "https://www.robomaster.com/zh-CN/robo/college",
    category: "机电", majors: ["机电", "计算机", "电子信息"],
    signStart: "2026-11-01", signEnd: "2026-12-15", eventDate: "2027-05-20", eventYear: 2027,
    intro: "RoboMaster 机甲大师赛结合机器视觉、嵌入式控制、机械设计等多学科技术，参赛队伍需自主研发多种机器人进行 7v7 对抗。赛事由大疆创新发起并承办，对工程能力锻炼极大，RoboMaster 俱乐部经历在硬件、算法岗位求职中认可度很高。",
    ruleChange: "2027 赛季新增「高校单项赛」：不组建完整战队的学校可仅报名步兵机器人单项对抗，降低参赛门槛。",
    materials: [
      { name: "战队注册表", desc: "在 RM 官网完成战队注册，登记全体成员与指导教师。" },
      { name: "机器人技术方案书", desc: "含机械结构、电控方案、视觉方案概述，用于分区赛审核。" },
      { name: "装备安全检验表", desc: "赛前需通过裁判系统与安全检验。" },
      { name: "保险与责任承诺书", desc: "参赛人员须购买意外险并签署免责条款。" }
    ],
    scenePhotos: ["img/scene-robo.jpg", "img/works-team.jpg"],
    past: [
      { year: 2025, scale: "全球 300+ 支战队参赛", award: "分区赛晋级全国赛约 24 队", note: "含机器人视觉、飞桨等专项奖" },
      { year: 2024, scale: "全球参赛战队 280+ 支", award: "总冠军奖金 20 万元", note: "赛事直播累计观看超千万" }
    ],
    works: [
      { year: 2025, title: "冠军战队步兵机器人自瞄系统开源", desc: "自研视觉自瞄方案（装甲板识别+弹道预测），开源仓库 Star 5.2k，成为各队入门必读。", award: "全国总冠军", photos: ["img/scene-robo.jpg", "img/works-cert.jpg"] }
    ],
    hot: false, tags: ["机器人", "视觉", "企业办赛"]
  },
  {
    id: "c09", kind: "comp", hostType: "national",
    name: "「外研社·国才杯」全国大学生外语能力大赛（演讲赛道，2026 赛季）", short: "外研社杯",
    level: "国家级", organizer: "外语教学与研究出版社",
    applyUrl: "https://contest.unipus.cn/",
    category: "外语", majors: ["外语", "综合类", "文法教育"],
    signStart: "2026-09-01", signEnd: "2026-11-30", eventDate: "2026-12-05", eventYear: 2026,
    intro: "「外研社·国才杯」系列赛事覆盖演讲、写作、阅读等赛道，是国内认可度最高的大学生英语赛事之一。演讲赛道经校级初赛、省级复赛、全国决赛三个阶段，全国决赛含即兴演讲与问答环节，冠军将代表中国参加国际赛事。",
    ruleChange: "2026 赛季演讲主题为「数字文明：跨越边界」，初赛可提交视频线上参与；决赛新增「AI 问答官」环节，考察临场思辨。",
    materials: [
      { name: "报名信息表", desc: "在赛事官网注册，选择演讲/写作/阅读赛道。" },
      { name: "定题演讲视频（初赛）", desc: "3 分钟内，横屏录制，含英文摘要字幕。" },
      { name: "演讲稿电子版", desc: "800 词以内，须标注引用来源。" },
      { name: "在读证明", desc: "省赛复核环节提交。" }
    ],
    scenePhotos: ["img/scene-answer.jpg"],
    past: [
      { year: 2025, scale: "全国 900+ 所高校参赛", award: "全国特等奖 6 人、一等奖约 90 人", note: "获奖者受邀参加国际青年论坛" }
    ],
    works: [
      { year: 2025, title: "全国冠军演讲稿《算法时代的共情》", desc: "以人与 AI 的共情边界切入，即兴问答环节表现惊艳，演讲视频全网播放超百万。", award: "全国特等奖", photos: ["img/scene-answer.jpg", "img/works-cert.jpg"] }
    ],
    hot: false, tags: ["英语演讲", "即兴", "外语类"]
  },
  {
    id: "c10", kind: "comp", hostType: "national",
    name: "全国大学生英语竞赛（NECCS 2027 春季赛）", short: "大英赛",
    level: "国家级", organizer: "高等学校大学外语教学研究会",
    applyUrl: "https://www.saikr.com/nesccs",
    category: "外语", majors: ["外语", "综合类"],
    signStart: "2026-12-01", signEnd: "2027-03-20", eventDate: "2027-04-12", eventYear: 2027,
    intro: "全国大学生英语竞赛（NECCS）是国内参与人数最多的英语综合能力竞赛，分 A（研究生）、B（英语专业）、C（非英专业本科）、D（专科）四类。题型涵盖听力、词汇、阅读、翻译、写作与智力测试，初赛由各校组织，决赛统一命题。",
    ruleChange: "2027 届起 C 类初赛全面采用机考，听力改为自适应播放（不重复），备考需重点训练「一遍听懂」能力。",
    materials: [
      { name: "竞赛报名表", desc: "选择 A/B/C/D 类别，经外语学院汇总。" },
      { name: "报名费凭证", desc: "30 元/人，含资料费。" },
      { name: "学生证复印件", desc: "类别资格核验。" }
    ],
    scenePhotos: ["img/scene-answer.jpg"],
    past: [
      { year: 2025, scale: "全国参赛人数约 110 万", award: "全国特等奖每类约 10 人、一等奖约 0.5%", note: "黑龙江赛区特等奖 4 人" }
    ],
    works: [
      { year: 2025, title: "C 类全国特等奖备考笔记", desc: "获奖者整理的 60 天备考计划与智力题速解技巧合集，社区累计下载 1.2 万次。", award: "全国特等奖", photos: ["img/works-model.jpg", "img/works-cert.jpg"] }
    ],
    hot: false, tags: ["英语", "机考", "综合能力"]
  },
  {
    id: "c11", kind: "comp", hostType: "national",
    name: "中国大学生计算机设计大赛（2027 届）", short: "计设大赛",
    level: "国家级", organizer: "教育部高校计算机类教学指导委员会",
    applyUrl: "https://jsjds.blcu.edu.cn/",
    category: "计算机", majors: ["计算机", "艺术传媒", "综合类"],
    signStart: "2027-01-05", signEnd: "2027-02-28", eventDate: "2027-05-25", eventYear: 2027,
    intro: "中国大学生计算机设计大赛以「作品赛」为主，涵盖软件应用与开发、微课与教学辅助、大数据、人工智能、数媒静态设计等多个大类。参赛需提交完整作品与文档，经校赛、省级赛推荐进入国赛，适合有课程设计、毕设作品的同学参赛。",
    ruleChange: "2027 届人工智能大类新增「智能体应用」小类，鼓励基于大模型 API 开发面向真实场景的 Agent 应用。",
    materials: [
      { name: "作品申报表", desc: "含作品简介、开发环境、团队分工与原创性声明。" },
      { name: "作品源码与安装包", desc: "提交可运行包与部署说明文档。" },
      { name: "演示视频（≤5 分钟）", desc: "完整功能演示，需配解说。" },
      { name: "作品说明文档", desc: "设计思路、技术架构、创新点说明。" }
    ],
    scenePhotos: ["img/scene-expo.jpg", "img/works-team.jpg"],
    past: [
      { year: 2025, scale: "全国 800+ 所院校、参赛作品约 4 万件", award: "国赛一等奖约 3%、二等奖约 12%", note: "黑龙江省赛每年 4 月举行" }
    ],
    works: [
      { year: 2025, title: "「银发守护」老年人反诈骗智能体", desc: "多模态诈骗识别+一键子女求助，覆盖 2000 名试点用户，获人工智能大类一等奖。", award: "国赛一等奖", photos: ["img/works-team.jpg", "img/scene-expo.jpg"] }
    ],
    hot: false, tags: ["作品赛", "人工智能", "数媒"]
  },
  {
    id: "c12", kind: "comp", hostType: "national",
    name: "全国大学生电子商务「三创赛」（2027 届）", short: "三创赛",
    level: "国家级", organizer: "教育部电子商务类专业教学指导委员会",
    applyUrl: "http://www.3chuang.net/",
    category: "经管", majors: ["经管", "计算机", "艺术传媒"],
    signStart: "2027-02-15", signEnd: "2027-04-10", eventDate: "2027-07-10", eventYear: 2027,
    intro: "「三创赛」即「创新、创意及创业」挑战赛，围绕电商与数字经济主题设 10+ 个赛道（跨境电商、乡村振兴、直播电商等）。每队 3-5 人，经校赛、省赛选拔至全国总决赛，是经管类专业认可度最高的赛事之一。",
    ruleChange: "2027 届新增「AI+电商」赛道，要求作品中实际使用智能客服、选品推荐等 AI 能力。",
    materials: [
      { name: "团队报名表", desc: "3-5 人团队，含队长信息与指导教师。" },
      { name: "项目策划书", desc: "围绕所选赛道的完整策划方案。" },
      { name: "演示视频", desc: "3 分钟内项目展示。" },
      { name: "校赛推荐名单", desc: "省级赛以校赛推荐为前提。" }
    ],
    scenePhotos: ["img/scene-answer.jpg", "img/scene-expo.jpg"],
    past: [
      { year: 2026, scale: "全国 1300+ 所高校、约 12 万队参赛", award: "国赛一等奖约 3%", note: "总决赛设跨境电商专项海外赛区" }
    ],
    works: [
      { year: 2026, title: "「黑土优品」黑龙江农产品直播电商矩阵", desc: "依托哈尔滨高校团队打造 12 个县域农产品直播间，年销售额破千万，获乡村振兴赛道一等奖。", award: "国赛一等奖", photos: ["img/scene-expo.jpg", "img/works-team.jpg"] }
    ],
    hot: false, tags: ["电商", "数字经济", "组队"]
  },
  {
    id: "c13", kind: "comp", hostType: "national",
    name: "「学创杯」全国大学生创业综合模拟大赛（2027 届）", short: "学创杯",
    level: "国家级", organizer: "高等学校国家级实验教学示范中心联席会",
    applyUrl: "http://www.xychuangbei.com/",
    category: "经管", majors: ["经管", "综合类"],
    signStart: "2027-03-10", signEnd: "2027-04-25", eventDate: "2027-06-15", eventYear: 2027,
    intro: "「学创杯」以创业模拟经营软件为载体，团队在虚拟环境中完成市场分析、产品研发、融资扩张等决策对抗，系统按经营绩效自动评分。比赛门槛低、周期短，适合低年级经管学生入门双创赛事。",
    ruleChange: "2027 届起财务报表模块评分权重提升至 40%，需重点训练现金流管理。",
    materials: [
      { name: "团队报名表", desc: "每队 3 人，填写组别（本科/高职）。" },
      { name: "报名费缴费凭证", desc: "每队 200 元。" },
      { name: "指导教师信息表", desc: "校赛推荐时同步提交。" }
    ],
    scenePhotos: ["img/scene-lab.jpg"],
    past: [
      { year: 2026, scale: "全国 1000+ 所高校参与", award: "国赛特等奖约 20 队", note: "分本科组与高职组" }
    ],
    works: [],
    hot: false, tags: ["模拟经营", "低年级友好", "入门"]
  },
  {
    id: "c14", kind: "comp", hostType: "national",
    name: "全国大学生智能汽车竞赛（2027 届）", short: "智能车",
    level: "国家级", organizer: "教育部自动化类专业教学指导委员会",
    applyUrl: "https://www.smart-car.org.cn/",
    category: "机电", majors: ["机电", "电子信息", "计算机"],
    signStart: "2026-11-10", signEnd: "2026-12-20", eventDate: "2027-07-20", eventYear: 2027,
    intro: "全国大学生智能汽车竞赛以「立足培养、重在参与」为宗旨，参赛队伍制作能够自主识别线路的智能车，在专用赛道上竞速。竞赛分摄像头、电磁、无线充电等多个组别，是自动化、电子类专业最经典的竞赛。",
    ruleChange: "2027 届新增「智能视觉组」允许使用边缘大模型进行赛道元素识别，鼓励软件算法队伍跨界参赛。",
    materials: [
      { name: "参赛队报名表", desc: "每队 3 人以内，登记组别。" },
      { name: "车模技术检验表", desc: "赛前按规则完成车模尺寸、传感器数量检验。" },
      { name: "报名费凭证", desc: "每队 300 元。" },
      { name: "在读证明", desc: "分赛区资格审核。" }
    ],
    scenePhotos: ["img/scene-robo.jpg", "img/scene-lab.jpg"],
    past: [
      { year: 2025, scale: "全国 500+ 所高校、4500+ 支队伍", award: "分赛区一等奖约 8%，晋级国赛队伍约 15%", note: "东北分赛区在哈尔滨设赛点" }
    ],
    works: [
      { year: 2025, title: "摄像头组国赛冠军技术报告", desc: "全集开源的图像透视变换+前瞻控制方案，圈速领先第二名 0.8 秒。", award: "全国特等奖", photos: ["img/scene-robo.jpg", "img/works-cert.jpg"] }
    ],
    hot: false, tags: ["智能车", "竞速", "嵌入式"]
  },
  {
    id: "c15", kind: "comp", hostType: "national",
    name: "全国大学生机械创新设计大赛（第八届已办，2026）", short: "机创大赛",
    level: "国家级", organizer: "教育部机械学科教学指导委员会",
    applyUrl: "https://umic.ussst.edu.cn/",
    category: "机电", majors: ["机电", "综合类"],
    signStart: "2025-12-01", signEnd: "2026-03-15", eventDate: "2026-07-25", eventYear: 2026,
    intro: "全国大学生机械创新设计大赛每两年一届，主题由组委会统一发布。参赛需完成实物样机的设计、加工、装配与现场演示，历届主题包括「改变生活的机械」「仿生机械」等。第八届主题为「智慧物流」，聚焦分拣、搬运、包装等环节的机械创新。",
    ruleChange: "第九届（2028）主题预计 2027 年底公布，关注官网获取第一手通知。",
    materials: [
      { name: "作品报名表", desc: "含作品名称、创新点、应用前景。" },
      { name: "设计说明书", desc: "含机构方案图、计算书、三维模型截图。" },
      { name: "实物演示视频", desc: "3 分钟样机运行视频，国赛现场需实物演示。" },
      { name: "加工成本清单", desc: "校级审核经费用。" }
    ],
    scenePhotos: ["img/scene-expo.jpg", "img/scene-lab.jpg"],
    past: [
      { year: 2026, scale: "全国 700+ 所院校、4300+ 件作品", award: "国赛一等奖约 2.5%", note: "实物演示占评分 40%" }
    ],
    works: [
      { year: 2026, title: "面向异形包裹的柔性分拣机械臂", desc: "软体抓手+视觉分拣一体机，异形件识别率 97.3%，现场演示零失误，夺得全国一等奖。", award: "国赛一等奖", photos: ["img/scene-expo.jpg", "img/works-team.jpg"] }
    ],
    hot: false, tags: ["机械设计", "实物", "两年一届"]
  },
  {
    id: "c16", kind: "comp", hostType: "national",
    name: "全国大学生广告艺术大赛（2027 春季赛）", short: "大广赛",
    level: "国家级", organizer: "教育部新闻传播学科教学指导委员会",
    applyUrl: "http://www.sun-idea.net/",
    category: "艺术传媒", majors: ["艺术传媒", "文法教育", "综合类"],
    signStart: "2027-01-10", signEnd: "2027-03-31", eventDate: "2027-05-10", eventYear: 2027,
    intro: "全国大学生广告艺术大赛（大广赛）是国内规模最大的文科类竞赛，围绕真实企业命题创作平面、视频、策划案、互动类等作品。命题来自知名品牌，获奖作品有机会被企业直接采用，适合设计、传媒、中文等专业同学参与。",
    ruleChange: "2027 春季起新增「AI 创意赛道」，允许使用生成式工具创作，但须提交创作过程说明。",
    materials: [
      { name: "作品上传件", desc: "按命题要求提交高分辨率成品（平面类 300dpi）。" },
      { name: "创作说明", desc: "300 字内创意阐述，AI 赛道须附过程说明。" },
      { name: "原创承诺书", desc: "全体创作成员签名确认无侵权。" },
      { name: "学生证扫描件", desc: "参赛资格核验。" }
    ],
    scenePhotos: ["img/scene-expo.jpg"],
    past: [
      { year: 2026, scale: "全国 1500+ 所高校、约 40 万件作品", award: "全国一等奖约 0.3%，二等奖约 1.2%", note: "分春季赛与秋季赛" }
    ],
    works: [
      { year: 2026, title: "《一滴入魂》矿泉水品牌短视频", desc: "以「时间凝固」视觉创意演绎水质纯净，全网播放 800 万，获视频类一等奖。", award: "全国一等奖", photos: ["img/works-cert.jpg", "img/works-team.jpg"] }
    ],
    hot: false, tags: ["广告创意", "文科生", "命题创作"]
  },
  {
    id: "c17", kind: "comp", hostType: "province",
    name: "黑龙江省「互联网+」大学生创新创业大赛选拔赛（2027）", short: "省选拔赛",
    level: "省级", organizer: "黑龙江省教育厅",
    applyUrl: "http://jyt.hlj.gov.cn/",
    category: "综合类", majors: ["综合类", "经管", "计算机", "医学", "机电"],
    signStart: "2027-03-15", signEnd: "2027-05-06", eventDate: "2027-06-05", eventYear: 2027,
    intro: "黑龙江省「互联网+」选拔赛是中国国际大学生创新大赛的省级通道，省赛金奖、银奖项目将代表黑龙江晋级全国赛。省内设有网评、会评两轮评审，注重项目的真实落地与龙江特色（农业、装备制造、冰雪经济等方向有加分倾向）。",
    ruleChange: "2027 年省赛增设「冰雪经济」专项通道，相关项目单独评审并获推荐名额倾斜。",
    materials: [
      { name: "省赛报名表", desc: "经校赛推荐后填报，含项目摘要与赛道。" },
      { name: "商业计划书（省赛版）", desc: "重点补强财务与落地数据。" },
      { name: "路演 PPT", desc: "8 分钟路演用，含团队页。" },
      { name: "佐证材料包", desc: "知识产权、合同、流水等。" }
    ],
    scenePhotos: ["img/scene-answer.jpg"],
    past: [
      { year: 2026, scale: "全省 70+ 所高校、1.2 万个项目参赛", award: "金奖 60 项、银奖 150 项", note: "晋级国赛项目 42 个" }
    ],
    works: [
      { year: 2026, title: "「雪绒花」冰雪旅游智能行程规划平台", desc: "整合滑雪场、民宿、交通数据的行程引擎，雪季覆盖游客 15 万人次，获省赛金奖并晋级国赛。", award: "省赛金奖", photos: ["img/works-team.jpg", "img/scene-expo.jpg"] }
    ],
    hot: false, tags: ["省级", "冰雪经济", "晋级通道"]
  },
  {
    id: "c18", kind: "comp", hostType: "school",
    name: "校选 · 第 23 届「启航杯」程序设计新生赛（哈尔滨工业大学）", short: "启航杯",
    level: "校级", organizer: "哈尔滨工业大学计算机学院团委",
    applyUrl: "",
    category: "计算机", majors: ["计算机", "数理", "电子信息"],
    signStart: "2026-10-20", signEnd: "2026-11-08", eventDate: "2026-11-23", eventYear: 2026,
    school: "哈尔滨工业大学",
    intro: "「启航杯」是面向入学新生的传统编程赛事，赛题难度友好，设热身赛两场与正赛一场。获奖新生将被推荐进入校 ACM 集训队，是低年级同学开启竞赛路线的最佳入口。本赛事通过校内渠道报名，无需外部链接。",
    ruleChange: "本届首次允许结对参赛（2 人一队），一人负责编码一人负责验题。",
    materials: [
      { name: "校内报名表", desc: "至学院团委或班主任处填写，新生赛无需报名费。" },
      { name: "学号信息", desc: "用于上机账号统一开通。" }
    ],
    scenePhotos: ["img/scene-lab.jpg"],
    past: [
      { year: 2025, scale: "全校 600+ 名新生参赛", award: "一等奖 20 人（保研综合测评加分）", note: "前 30 名直通 ACM 集训队面试" }
    ],
    works: [
      { year: 2025, title: "新生组冠军 AK 全场复盘", desc: "大一新生 120 分钟 AK（全部通过），其题解笔记在校内社区被置顶推荐。", award: "一等奖第一名", photos: ["img/works-model.jpg"] }
    ],
    hot: false, tags: ["校内赛", "新生友好", "ACM 入口"]
  },
  {
    id: "c19", kind: "comp", hostType: "school",
    name: "校选 · 新生英语演讲比赛（黑龙江大学 2026）", short: "校内演讲赛",
    level: "校级", organizer: "黑龙江大学教务处、校团委",
    applyUrl: "",
    category: "外语", majors: ["外语", "综合类", "文法教育"],
    signStart: "2026-10-20", signEnd: "2026-11-05", eventDate: "2026-11-22", eventYear: 2026,
    school: "黑龙江大学",
    intro: "黑龙江大学新生英语演讲比赛由教务处与校团委联合主办，优秀选手将进入校队集训，代表学校参加「外研社·国才杯」省级复赛。比赛含 3 分钟定题演讲与 2 分钟即兴问答。校内报名，无需外部链接。",
    ruleChange: "本届定题「My Digital Campus」，初赛首次采用线上视频投稿。",
    materials: [
      { name: "校内报名表", desc: "英语学院或辅导员处领取。" },
      { name: "初赛视频", desc: "线上投稿：3 分钟定题演讲横屏视频。" }
    ],
    scenePhotos: ["img/scene-answer.jpg"],
    past: [
      { year: 2025, scale: "全校报名 300+ 人", award: "特等奖 2 人入选校队", note: "决赛全程英文直播" }
    ],
    works: [],
    hot: false, tags: ["校内赛", "英语", "校队选拔"]
  },
  {
    id: "c20", kind: "comp", hostType: "enterprise",
    name: "华为ICT大赛2026-2027（中国区）", short: "华为ICT大赛",
    level: "国家级", organizer: "华为技术有限公司",
    applyUrl: "https://competition.huaweicloud.com/ict",
    category: "计算机", majors: ["计算机", "电子信息", "数理"],
    signStart: "2026-10-20", signEnd: "2026-11-30", eventDate: "2027-03-15", eventYear: 2027,
    intro: "华为ICT大赛是华为面向全球高校打造的ICT人才竞技赛事，中国区分省赛、国赛两级，赛道覆盖云（Cloud）、网络（Network）、昇腾AI等方向。企业办赛特色鲜明：获奖者可获华为认证考试券、实习绿色通道，总决赛优胜者晋级全球赛。",
    ruleChange: "本届新增「昇腾AI应用创新」赛道，围绕大模型部署与推理优化命题，参赛即送HCIA学习券。",
    materials: [
      { name: "官网注册报名", desc: "在华为云大赛平台实名注册，选择赛道与组别。" },
      { name: "队伍信息表", desc: "1-3 人组队，需指定学校与指导老师。" },
      { name: "学生证核验", desc: "省赛前完成学籍核验。" }
    ],
    scenePhotos: ["img/scene-expo.jpg", "img/scene-answer.jpg"],
    past: [
      { year: 2026, scale: "全球 80+ 国家、2000+ 所高校、12 万+ 人参赛", award: "中国区一等奖约 2%，可获实习直通", note: "总决赛设全球赛区" }
    ],
    works: [
      { year: 2026, title: "「云边协同」输电线路巡检方案", desc: "基于 ModelArts 的边缘部署方案，识别时延降至 300ms，获中国区实践赛一等奖并晋级全球赛。", award: "中国区一等奖", photos: ["img/works-team.jpg", "img/scene-expo.jpg"] }
    ],
    hot: true, tags: ["企业办赛", "ICT", "实习直通"]
  },
  {
    id: "c21", kind: "comp", hostType: "enterprise",
    name: "「西门子杯」中国智能制造挑战赛（2027 届）", short: "西门子杯",
    level: "国家级", organizer: "教育部高等学校自动化类专业教学指导委员会、西门子（中国）有限公司",
    applyUrl: "https://www.siemens-cup-cimc.org/",
    category: "机电", majors: ["机电", "电子信息", "计算机"],
    signStart: "2027-01-10", signEnd: "2027-03-01", eventDate: "2027-07-15", eventYear: 2027,
    intro: "「西门子杯」聚焦智能制造与工业自动化，赛项覆盖流程行业自动化、智能网络、运动控制、数字化双胞胎等方向。作为校企合作办赛的标杆赛事，获奖经历在装备制造、汽车、能源行业求职中认可度极高。",
    ruleChange: "2027 届新增「AI+工业质检」体验赛项，允许本科生用 TIA Portal + 边缘推理方案参赛。",
    materials: [
      { name: "报名表（官网填报）", desc: "选择赛项与组别，3 人一队。" },
      { name: "在读证明", desc: "学籍核验。" },
      { name: "参赛方案书", desc: "部分赛项初评需提交技术方案。" }
    ],
    scenePhotos: ["img/scene-lab.jpg"],
    past: [
      { year: 2026, scale: "全国 600+ 所高校、1.5 万+ 队参赛", award: "全国特等奖约 10 队、一等奖约 3%", note: "分研究生/本科/高职组" }
    ],
    works: [
      { year: 2026, title: "柔性产线数字化双胞胎调度优化", desc: "在虚拟产线完成混排调度的多目标优化，CT 缩短 12%，获全国特等奖。", award: "全国特等奖", photos: ["img/scene-lab.jpg", "img/works-cert.jpg"] }
    ],
    hot: false, tags: ["企业办赛", "智能制造", "工业4.0"]
  },
  {
    id: "c22", kind: "comp", hostType: "union",
    name: "东北三省大学生数学建模联赛（2026）", short: "东三省数模",
    level: "省级", organizer: "黑吉辽三省高校联合发起、轮值主办",
    applyUrl: "http://dbm.example-cm.org.cn/",
    category: "数理", majors: ["数理", "计算机", "综合类", "经管"],
    signStart: "2026-11-20", signEnd: "2026-12-10", eventDate: "2027-01-09", eventYear: 2027,
    intro: "东北三省大学生数学建模联赛由黑、吉、辽三省高校联合发起，校际联合办赛，题目侧重东北区域经济与产业真实问题（寒地农业、冰雪旅游、老工业基地转型等）。联赛成绩被三省多数高校认定为省级赛事，是国赛前的重要练兵。",
    ruleChange: "本届联合主办方轮值至黑龙江省高校，新增「寒地生态」主题题，优秀论文将推荐至省级期刊。",
    materials: [
      { name: "联赛报名表", desc: "3 人一队，由各校数学学院统一提交。" },
      { name: "参赛承诺书", desc: "独立完成承诺与查重同意。" },
      { name: "报名费凭证", desc: "每队 200 元，部分院校可报销。" }
    ],
    scenePhotos: ["img/works-model.jpg", "img/scene-lab.jpg"],
    past: [
      { year: 2025, scale: "三省 90+ 所高校、约 4600 队参赛", award: "一等奖约 3%、二等奖约 8%", note: "辽宁高校轮值主办" }
    ],
    works: [
      { year: 2025, title: "「寒地黑土」秸秆还田决策模型", desc: "结合气象与土壤数据的还田时机优化，被试点农场采用，获联赛一等奖。", award: "联赛一等奖", photos: ["img/works-model.jpg", "img/works-team.jpg"] }
    ],
    hot: false, tags: ["校际联合", "区域联赛", "练兵赛"]
  },

  /* ============ 考试 ============ */
  {
    id: "e01", kind: "exam", hostType: "cert-national",
    name: "全国大学英语四、六级考试（2026 年下半年笔试）", short: "CET 四六级",
    level: "国家级", organizer: "教育部教育考试院",
    applyUrl: "https://cet-bm.neea.edu.cn/",
    category: "外语", majors: ["不限专业", "外语", "综合类"],
    signStart: "2026-09-01", signEnd: "2026-09-25", eventDate: "2026-12-19", eventYear: 2026,
    intro: "全国大学英语四、六级考试（CET）每年举办两次（6 月、12 月），四级达 425 分方可报考六级。成绩报告单同时呈现总分与听力、阅读、写作翻译三部分分数，是保研、求职、公务员报考最常被要求的英语水平证明。本次笔试时间为 2026 年 12 月 19 日，口语考试（CET-SET）于 11 月 22-23 日举行。",
    ruleChange: "多地考点正在试点「机考化」改革，听力量表分值权重逐步提升；建议按机考模式训练，重点提升一遍听懂能力。",
    materials: [
      { name: "网上报名信息填报", desc: "在 CET 报名系统完成资格确认（学籍、照片）与科目选择。" },
      { name: "电子证件照", desc: "白底标准照，系统自动校验（头部比例 1/3 左右）。" },
      { name: "报名费缴费", desc: "笔试 30 元/科次，口语 50 元，网银或支付宝。" },
      { name: "准考证打印", desc: "考前一周登录报名系统自行打印（12 月初开放）。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全国报考人数约 1900 万人次", award: "四级平均通过率约 40%（依校差异大）", note: "12 月考次成绩次年 2 月底发布" },
      { year: 2024, scale: "全国报考约 1800 万人次", award: "六级平均通过率约 35%", note: "985 院校四级一次通过率普遍 80%+" }
    ],
    works: [],
    hot: true, tags: ["英语", "求职必备", "一年两次"]
  },
  {
    id: "e02", kind: "exam", hostType: "cert-prov",
    name: "黑龙江省普通高校专升本考试（2027 届）", short: "专升本",
    level: "省级", organizer: "黑龙江省招生考试院",
    applyUrl: "https://www.lzk.hl.cn/",
    category: "综合类", majors: ["不限专业", "综合类", "计算机", "经管", "文法教育", "医学"],
    signStart: "2026-10-25", signEnd: "2026-11-05", eventDate: "2027-03-28", eventYear: 2027,
    intro: "黑龙江省专升本考试面向省内高职（专科）应届毕业生，实行「文化课+专业技能」全省统一考试。文化课考外语（英语/日语/俄语）与计算机基础（部分类别为高数），满分各 100 分；专业综合课依报考类别而定。2027 届报名将于 10 月 25 日启动，错过不补，请务必在截止前完成网上报名与缴费。",
    ruleChange: "2027 届起计算机基础科目改为机考，并新增「冰雪产业」相关技能考核方向；退役士兵免试政策继续执行。",
    materials: [
      { name: "网上报名信息表", desc: "在黑龙江省招生考试信息港填报，含报考类别与专业志愿。" },
      { name: "学籍在线验证报告", desc: "学信网下载 PDF 版，核验应届专科身份。" },
      { name: "身份证正反面扫描件", desc: "用于报名资格审核。" },
      { name: "报名费缴费凭证", desc: "约 150 元/人，网银缴纳。" },
      { name: "退役士兵佐证（如适用）", desc: "退役证与安置证明，用于免试申请。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2026, scale: "全省报名约 2.7 万人，录取约 1.6 万人", award: "公办院校录取率约 41%，总体录取率约 59%", note: "哈尔滨商业大学、黑龙江科技大学为主要承接院校" },
      { year: 2025, scale: "全省报名约 2.4 万人", award: "总体录取率约 57%", note: "报考人数逐年上升" }
    ],
    works: [],
    hot: true, tags: ["专升本", "统考", "应届专科"]
  },
  {
    id: "e03", kind: "exam", hostType: "cert-national",
    name: "全国计算机等级考试 NCRE（2027 年 3 月考次）", short: "计算机等级",
    level: "国家认证", organizer: "教育部教育考试院",
    applyUrl: "https://ncre-bm.neea.edu.cn/",
    category: "计算机", majors: ["不限专业", "计算机", "综合类"],
    signStart: "2026-12-20", signEnd: "2027-01-10", eventDate: "2027-03-27", eventYear: 2027,
    intro: "全国计算机等级考试（NCRE）每年开考四次，二级为在校生报考最多的级别，科目包括 MS Office 高级应用、Python、C、Java、Web 程序设计等。二级证书是公务员部分岗位、国企招聘的常见要求，Python 科目近三年报考量增长最快。",
    ruleChange: "2027 年起二级所有科目全面无纸化机考，选择题占比提升至 40%，新增「WPS Office」报考科目。",
    materials: [
      { name: "网上报名填报", desc: "NCRE 报名系统选择考点与科目。" },
      { name: "电子证件照", desc: "白底证件照，用于准考证与证书。" },
      { name: "报名费缴费", desc: "二级 80 元/科目（各省略有差异）。" },
      { name: "准考证", desc: "考前 3 天系统开放打印。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2026, scale: "全国报考约 900 万人次（全年累计）", award: "二级合格率约 45%（MS Office 约 40%，Python 约 35%）", note: "成绩直免自考相关课程" },
      { year: 2025, scale: "全年累计报考约 850 万人次", award: "合格率逐年小幅下降", note: "报考科目以 MS Office 与 Python 为主" }
    ],
    works: [],
    hot: false, tags: ["机考", "Office", "Python"]
  },
  {
    id: "e04", kind: "exam", hostType: "cert-national",
    name: "计算机技术与软件专业技术资格（水平）考试（2026 下半年）", short: "软考",
    level: "国家认证", organizer: "工业和信息化部、人社部",
    applyUrl: "https://www.ruankao.org.cn/",
    category: "计算机", majors: ["计算机", "电子信息", "综合类"],
    signStart: "2026-08-15", signEnd: "2026-09-10", eventDate: "2026-11-07", eventYear: 2026,
    intro: "软考是由工信部和人社部组织的国家级职业资格考试，2026 下半年考次于 11 月 7-8 日举行。中级「软件设计师」「系统集成项目管理工程师」与高级「信息系统项目管理师」为报考热门，证书以考代评、可用于职称聘任、积分落户加分，高级证书在部分城市可对应副高级职称。",
    ruleChange: "2026 下半年起实行「机考+论文双模块」（高级），论文须在考试系统内电子作答；成绩滚动管理试点未在全国推开。",
    materials: [
      { name: "网上报名填报", desc: "中国计算机技术职业资格网注册报名，选择考区与资格。" },
      { name: "学历/在职证明", desc: "部分考区审核需要。" },
      { name: "电子证件照", desc: "白底，用于准考证与证书。" },
      { name: "报名费缴费", desc: "中级 140 元左右、高级 190 元左右（各省不同）。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全年报考约 120 万人", award: "软件设计师通过率约 25%，系统集成约 30%", note: "黑龙江考区在哈尔滨设考点" },
      { year: 2024, scale: "全年报考约 110 万人", award: "整体通过率约 27%", note: "科目设置逐年调整" }
    ],
    works: [],
    hot: true, tags: ["职称", "落户加分", "以考代评"]
  },
  {
    id: "e05", kind: "exam", hostType: "cert-national",
    name: "中小学教师资格考试（笔试·2026 下半年）", short: "教资笔试",
    level: "国家认证", organizer: "教育部教育考试院",
    applyUrl: "https://ntce.neea.edu.cn/",
    category: "文法教育", majors: ["文法教育", "综合类", "外语"],
    signStart: "2026-07-01", signEnd: "2026-09-05", eventDate: "2026-11-01", eventYear: 2026,
    intro: "2026 下半年教师资格笔试将于 11 月 1 日举行。幼儿园、小学学段考《综合素质》+《保教知识与能力》或《教育教学知识与能力》；中学学段加考《学科知识与教学能力》。笔试单科成绩保留 2 年，全部通过后方可报名面试。黑龙江省考区报名费每科 50 元。",
    ruleChange: "2026 起面试报名审核更严格，须上传居住证明或在校学籍证明；建议大三及以上学段报考，避免成绩过期。",
    materials: [
      { name: "NTCE 报名填报", desc: "选择省份、学段与科目，须与居住/学籍地一致。" },
      { name: "学籍证明或居住证", desc: "在校生用学籍在线报告，社会人员用居住证。" },
      { name: "电子证件照", desc: "白底免冠，用于准考证。" },
      { name: "普通话等级证书（认定阶段）", desc: "认定环节需二级乙等以上，语文需二甲。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全国报考约 1100 万人次（全年笔试+面试）", award: "笔试通过率约 30%", note: "黑龙江省面试通过率约 45%" }
    ],
    works: [],
    hot: false, tags: ["教师", "考编", "文科"]
  },
  {
    id: "e06", kind: "exam", hostType: "cert-school",
    name: "普通话水平测试（2026 年 11 月校内批次）", short: "普通话",
    level: "国家认证", organizer: "国家语委普通话培训测试中心",
    applyUrl: "",
    category: "文法教育", majors: ["不限专业", "文法教育", "外语"],
    signStart: "2026-10-21", signEnd: "2026-10-28", eventDate: "2026-11-15", eventYear: 2026,
    intro: "普通话水平测试为计算机辅助口语考试，内容含读单音节字词、多音节词语、朗读短文、命题说话四项。一级乙等及以上需省级测试员复核。报考语文教师资格、播音主持相关岗位通常要求二级甲等以上。本次校内批次面向全体在校生开放，名额 400 人，通过校内渠道报名。",
    ruleChange: "2026 年起启用新版《普通话水平测试规程》，命题说话时间由 3 分钟调整为 2.5 分钟，评分侧重自然流畅度。",
    materials: [
      { name: "校内批次报名表", desc: "语言文字工作委员会或教务处领取，填学号与联系方式。" },
      { name: "测试费", desc: "50 元/人（学生价），现场或扫码缴纳。" },
      { name: "身份证", desc: "测试当天核验身份。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全国参加测试约 1000 万人次", award: "在校生二级甲等率约 55%（北方方言区更高）", note: "哈市高校批次测试费 50 元/人" }
    ],
    works: [],
    hot: false, tags: ["口语", "教资前置", "校内批次"]
  },
  {
    id: "e07", kind: "exam", hostType: "cert-intl",
    name: "雅思考试 IELTS（2026 年 11 月学术类纸笔场次）", short: "雅思",
    level: "国际认证", organizer: "英国文化教育协会（BC）",
    applyUrl: "https://ielts.neea.cn/",
    category: "外语", majors: ["外语", "综合类", "医学"],
    signStart: "2026-09-15", signEnd: "2026-10-29", eventDate: "2026-11-14", eventYear: 2026,
    intro: "雅思学术类（A 类）成绩被英联邦及多数欧美院校认可，总分 9 分，有效期 2 年。哈尔滨工业大学考点设纸笔与机考两种模式。出国交换、留学申请通常要求总分 6.5 且单项不低于 6.0。本场次报名将于考前 16 天截止。",
    ruleChange: "2026 年起机考口语全面采用「视频通话真人考官」模式，与线下面对面形式并行；单科重考（One Skill Retake）已在大陆考点逐步开放。",
    materials: [
      { name: "NEEA 注册与报名", desc: "教育部考试中心雅思报名网站注册，绑定身份证件。" },
      { name: "有效身份证件", desc: "二代身份证或护照，报名与考试须一致。" },
      { name: "考费缴纳", desc: "2170 元/次，支持支付宝。" },
      { name: "准考证", desc: "考前 10 天打印，含口试时间。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全球报考约 400 万人次", award: "中国大陆考生均分约 6.2（学术类）", note: "哈尔滨设 3 个考点" }
    ],
    works: [],
    hot: false, tags: ["留学", "国际认证", "两年有效"]
  },
  {
    id: "e08", kind: "exam", hostType: "cert-national",
    name: "全国翻译专业资格考试 CATTI（2026 下半年）", short: "CATTI",
    level: "国家认证", organizer: "中国外文局",
    applyUrl: "https://www.catti.net.cn/",
    category: "外语", majors: ["外语", "文法教育"],
    signStart: "2026-06-20", signEnd: "2026-09-25", eventDate: "2026-10-24", eventYear: 2026,
    intro: "CATTI 是翻译行业唯一纳入国家职业资格制度的考试，分一、二、三级，口笔译分开报考。三级笔译适合外语专业本科高年级学生入门；二级可对应翻译系列中级职称。2026 下半年考次本周末开考，准考证即日起可打印。",
    ruleChange: "2026 起笔译实务科目允许携带纸质词典（英汉、汉英各一本），但阅卷对 AI 味译文扣分更严，建议平时训练人工润色能力。",
    materials: [
      { name: "官网报名填报", desc: "中国人事考试网报名，选择语种、级别、口/笔译。" },
      { name: "学历或学籍证明", desc: "部分级别审核需要。" },
      { name: "考费缴纳", desc: "三级笔译约 170 元（各省不同）。" },
      { name: "准考证", desc: "考前一周打印。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全国报考约 30 万人次", award: "三级笔译通过率约 20%，二级笔译约 12%", note: "黑龙江省考区在哈尔滨设置" }
    ],
    works: [],
    hot: false, tags: ["翻译", "职称", "外语类"]
  },
  {
    id: "e09", kind: "exam", hostType: "cert-national",
    name: "初级会计专业技术资格考试（2027 年）", short: "初级会计",
    level: "国家认证", organizer: "财政部、人社部",
    applyUrl: "http://kzp.mof.gov.cn/",
    category: "经管", majors: ["经管", "综合类"],
    signStart: "2027-01-05", signEnd: "2027-01-24", eventDate: "2027-05-16", eventYear: 2027,
    intro: "初级会计职称设《初级会计实务》《经济法基础》两科，须在一个考试年度内全部通过。报名仅要求高中及以上学历，是在校经管学生「人手一本」的基础证书，考试形式为无纸化机考，题型均为客观题。",
    ruleChange: "2027 年教材按新收入准则、增值税法最新口径修订，预计变化章节约占分值 15%，建议使用新版教材备考。",
    materials: [
      { name: "全国会计资格评价网报名", desc: "注册后选择考区，在校生可选学校所在地。" },
      { name: "学历证明", desc: "高中及以上（大学在读可用学籍证明）。" },
      { name: "电子证件照", desc: "白底，用于准考证与证书。" },
      { name: "考费缴纳", desc: "每科 50-60 元，两科约 110 元。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2026, scale: "全国报考约 345 万人", award: "通过率约 22%", note: "黑龙江考区机位紧张，报名宜早" }
    ],
    works: [],
    hot: false, tags: ["财会", "入门证书", "机考"]
  },
  {
    id: "e10", kind: "exam", hostType: "cert-industry",
    name: "全国导游资格考试（2026 年）", short: "导游证",
    level: "行业认证", organizer: "文化和旅游部",
    applyUrl: "https://mr.mct.gov.cn/",
    category: "文法教育", majors: ["文法教育", "经管", "外语", "综合类"],
    signStart: "2026-07-01", signEnd: "2026-08-20", eventDate: "2026-11-21", eventYear: 2026,
    intro: "全国导游资格考试含笔试四科（政策法规、导游业务、全国导游基础知识、地方导游基础知识）与现场口试。黑龙江考区口试重点考查冰雪旅游、边境旅游讲解。取得资格证后挂靠旅行社或导协可换取电子导游证，适合想利用假期带团的在校生。",
    ruleChange: "2026 年起现场口试采用「模拟讲解+随机问询」新评分表，讲解时长缩短至 6 分钟，更看重互动应变。",
    materials: [
      { name: "全国旅游监管服务平台报名", desc: "选择黑龙江考区，填报语种。" },
      { name: "学历证明", desc: "高中及以上（在读大学生可用学籍报告）。" },
      { name: "健康承诺书", desc: "全国统考不再强制体检，改为健康承诺。" },
      { name: "考费缴纳", desc: "黑龙江考区约 200 元。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全国报考约 22 万人", award: "整体通过率约 28%（各省差异大）", note: "黑龙江口试通过率约 40%" }
    ],
    works: [],
    hot: false, tags: ["文旅", "兼职带团", "口试"]
  },
  {
    id: "e11", kind: "exam", hostType: "cert-intl",
    name: "剑桥商务英语中级 BEC Vantage（2026 年 12 月场次）", short: "BEC 中级",
    level: "国际认证", organizer: "剑桥大学英语考评部",
    applyUrl: "https://www.cambridgeenglish.cn/",
    category: "外语", majors: ["外语", "经管", "综合类"],
    signStart: "2026-09-10", signEnd: "2026-11-10", eventDate: "2026-12-05", eventYear: 2026,
    intro: "BEC 中级考查商务场景下的听、说、读、写四项能力，证书终身有效，被众多外企与银行认可为商务英语能力证明。口试为双人一组与考官互动完成，写作含商务信函与报告，适合经管、外语专业同学报考。",
    ruleChange: "2026 年起大陆考点口语搭档随机分配，不再允许自行组队，备考需适应与陌生人配对。",
    materials: [
      { name: "考点官网报名", desc: "在剑桥官方或授权考点注册，选择 BEC Vantage。" },
      { name: "身份证件", desc: "报名与考试须为同一证件。" },
      { name: "考费缴纳", desc: "中级约 660 元。" },
      { name: "准考证/确认信", desc: "考前一周考点发送。" }
    ],
    scenePhotos: [],
    past: [
      { year: 2025, scale: "全球报考约 30 万人次", award: "中国考生 B2 通过率约 38%", note: "哈尔滨考点设于黑龙江大学" }
    ],
    works: [],
    hot: false, tags: ["商务英语", "终身有效", "外企"]
  }
];

/* ---------- 学校与校内通知（typeCat: 比赛类/考试类; majors: 适配专业） ---------- */
DB.schools = [
  {
    id: "s01", name: "哈尔滨工业大学", short: "哈工大",
    notices: [
      { time: "10-18 09:30", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "第 23 届「启航杯」程序设计新生赛报名开启", desc: "面向 2026 级新生，结对参赛（2 人一队）模式首次开放，前 30 名直通 ACM 集训队面试。", majors: ["计算机", "数理", "电子信息"], teacher: "王老师 · 计算机学院", phone: "0451-8641xxxx", email: "cs-club@hit.example.edu.cn" },
      { time: "10-16 14:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "第十八届蓝桥杯校内报名通道已开放", desc: "学校统一组织报名，软件类报名费由学院竞赛基金补贴 50%，训练赛每周三晚在活动中心 201 举行。", majors: ["计算机", "电子信息", "数理"], teacher: "李老师 · 软件学院", phone: "0451-8641xxxx", email: "lanqiao-club@hit.example.edu.cn" },
      { time: "10-12 10:00", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2026 年 11 月批次普通话水平测试报名通知", desc: "11 月 15 日测试，报名截止 10 月 28 日，名额 400 人，先到先得。语文教师资格申请者须二甲以上。", majors: ["不限专业", "文法教育", "外语"], teacher: "张老师 · 语言文字工作委员会", phone: "0451-8641xxxx", email: "putonghua@hit.example.edu.cn" },
      { time: "10-08 16:20", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "「挑战杯」课外学术科技作品竞赛校内选拔启动", desc: "第十九届校赛报名 11 月 15 日启动，有意向团队请提前联系指导教师确定选题方向。", majors: ["综合类", "计算机", "机电", "医学", "文法教育"], teacher: "赵老师 · 校团委科创部", phone: "0451-8641xxxx", email: "kcsb@hit.example.edu.cn" },
      { time: "09-28 11:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "ACM-ICPC 区域赛集训队招新补录", desc: "区域赛报名 10 月 25 日截止，集训队面向大二补录 4 名队员，周五晚机房 305 选拔赛。", majors: ["计算机", "数理"], teacher: "王老师 · 计算机学院", phone: "0451-8641xxxx", email: "acm@hit.example.edu.cn" },
      { time: "09-20 10:00", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2026 下半年四六级考前听力集训安排", desc: "12 月 19 日笔试，每周二、四晚 18:30 主楼语音室开放，扫码预约座位。", majors: ["不限专业", "外语"], teacher: "董老师 · 外语学院", phone: "0451-8641xxxx", email: "cet@hit.example.edu.cn" }
    ]
  },
  {
    id: "s02", name: "哈尔滨工程大学", short: "哈工程",
    notices: [
      { time: "10-17 11:00", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "「三海一核」科技创新作品征集令", desc: "围绕船海核特色征集学术科技作品，优秀作品直通「挑战杯」校赛推荐名单。", majors: ["机电", "电子信息", "综合类"], teacher: "陈老师 · 校团委", phone: "0451-8251xxxx", email: "kb@hrbeu.example.edu.cn" },
      { time: "10-14 09:00", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2026 下半年普通话测试校内批次通知", desc: "11 月 22 日测试，报名 10 月 21 日-11 月 1 日，测试费 50 元。", majors: ["不限专业", "文法教育"], teacher: "刘老师 · 教务处", phone: "0451-8251xxxx", email: "jwc@hrbeu.example.edu.cn" },
      { time: "10-10 15:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生电子设计竞赛校内动员会", desc: "2027 届电赛备战启动，将组建 8 支校队并开放实验室，欢迎自动化、信息类同学参加。", majors: ["电子信息", "机电", "计算机"], teacher: "孙老师 · 智能科学学院", phone: "0451-8251xxxx", email: "dianzai@hrbeu.example.edu.cn" }
    ]
  },
  {
    id: "s03", name: "黑龙江大学", short: "黑大",
    notices: [
      { time: "10-18 10:00", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "新生英语演讲比赛报名即将截止", desc: "11 月 5 日截止，定题「My Digital Campus」，特等奖 2 名将进入校队集训。", majors: ["外语", "综合类", "文法教育"], teacher: "周老师 · 英语学院", phone: "0451-8660xxxx", email: "english@hlju.example.edu.cn" },
      { time: "10-15 14:30", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生英语竞赛（NECCS）校内报名预告", desc: "2027 春季赛 12 月开放报名，学校将组织 4 场真题模考，C 类适合非英专业学生。", majors: ["外语", "综合类"], teacher: "吴老师 · 大学外语教研部", phone: "0451-8660xxxx", email: "neccs@hlju.example.edu.cn" },
      { time: "10-11 09:00", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2026 下半年全国计算机等级考试校内考点安排", desc: "黑大考点承接 12 月/3 月考次，校内报名点设于实验楼 305，可协助团体报名。", majors: ["不限专业", "计算机"], teacher: "郑老师 · 信息管理学院", phone: "0451-8660xxxx", email: "ncre@hlju.example.edu.cn" },
      { time: "10-09 16:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "「三创赛」2027 届黑大选拔赛启动", desc: "围绕直播电商、跨境电商选题组队，商学院企业导师全程指导，12 月校赛。", majors: ["经管", "艺术传媒", "计算机"], teacher: "马老师 · 商学院", phone: "0451-8660xxxx", email: "sanchuang@hlju.example.edu.cn" }
    ]
  },
  {
    id: "s04", name: "哈尔滨商业大学", short: "哈商大",
    notices: [
      { time: "10-17 16:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "「三创赛」2027 届校内组队动员", desc: "围绕黑龙江农产品电商、冰雪消费选题组建团队，商学院将开放企业导师资源。", majors: ["经管", "计算机", "艺术传媒"], teacher: "马老师 · 商学院", phone: "0451-8484xxxx", email: "sanchuang@hrbcu.example.edu.cn" },
      { time: "10-13 10:30", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2027 年初级会计职称备考班报名", desc: "学校联合继续教育学院开设周末备考班，教材统一团购，报名截止 12 月底。", majors: ["经管", "综合类"], teacher: "冯老师 · 会计学院", phone: "0451-8484xxxx", email: "kjxy@hrbcu.example.edu.cn" }
    ]
  },
  {
    id: "s05", name: "哈尔滨师范大学", short: "哈师大",
    notices: [
      { time: "10-18 08:40", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2026 下半年教资笔试考前辅导通知", desc: "11 月 1 日笔试，教育科学学院组织 3 场冲刺辅导，地点陶行知楼 204。", majors: ["文法教育", "综合类", "外语"], teacher: "何老师 · 教师教育学院", phone: "0451-8806xxxx", email: "jszg@hrbnu.example.edu.cn" },
      { time: "10-15 13:20", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "师范生教学技能大赛校赛启动", desc: "11 月校赛，比赛含模拟授课、板书、答辩三环节，优胜者推荐参加省赛。", majors: ["文法教育", "外语", "综合类"], teacher: "杨老师 · 教务处", phone: "0451-8806xxxx", email: "jnds@hrbnu.example.edu.cn" }
    ]
  },
  {
    id: "s06", name: "东北林业大学", short: "东北林大",
    notices: [
      { time: "10-16 15:10", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生数学建模竞赛获奖经验分享会", desc: "2026 届国赛一等奖队伍主讲，11 月另开 2027 届组队预报名。", majors: ["数理", "计算机", "综合类"], teacher: "林老师 · 理学院", phone: "0451-8219xxxx", email: "shumo@nefu.example.edu.cn" },
      { time: "10-12 09:40", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "生态文明创意设计大赛报名", desc: "12 月校赛，作品含文创设计、科普视频两类，特等奖推荐参加全国生态文明竞赛。", majors: ["艺术传媒", "文法教育", "综合类"], teacher: "崔老师 · 林学院", phone: "0451-8219xxxx", email: "eco@nefu.example.edu.cn" }
    ]
  },
  {
    id: "s07", name: "黑龙江科技大学", short: "黑科大",
    notices: [
      { time: "10-17 09:20", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生智能汽车竞赛校内选拔", desc: "2027 届报名 11 月 10 日开始，学校将开放嵌入式实验室并组织老队员培训。", majors: ["机电", "电子信息", "计算机"], teacher: "徐老师 · 电气与控制工程学院", phone: "0451-8803xxxx", email: "zncar@usth.example.edu.cn" },
      { time: "10-14 11:00", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2026 下半年四六级考前听力集训", desc: "12 月 19 日笔试，每周二、四晚在主楼语音室进行听力集训，扫码预约。", majors: ["不限专业", "外语"], teacher: "董老师 · 外语学院", phone: "0451-8803xxxx", email: "cet@usth.example.edu.cn" }
    ]
  },
  {
    id: "s08", name: "大庆职业学院", short: "大庆职院",
    notices: [
      { time: "10-18 10:20", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "2026 年职业技能大赛校内选拔启动", desc: "围绕石油化工、智能制造、汽车检修等省级赛项选拔队员，11 月校赛，优胜者组队代表学校出征省赛。", majors: ["机电", "电子信息", "计算机"], teacher: "白老师 · 智能制造学院", phone: "0459-5812xxxx", email: "jnjs@dqzy.example.edu.cn" },
      { time: "10-15 14:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "「西门子杯」智能制造挑战赛动员报名", desc: "企业办赛，获奖可获西门子实习优先通道，学校开放 PLC 实训室备战，12 月校内集训。", majors: ["机电", "电子信息", "计算机"], teacher: "迟老师 · 电气工程系", phone: "0459-5812xxxx", email: "s7@dzu.example.edu.cn" },
      { time: "10-11 09:30", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "1+X 证书（工业机器人操作与运维）考试报名", desc: "12 月中旬考试，中级考评，报考学生须完成 64 学时培训，报名截止 11 月 10 日。", majors: ["机电", "电子信息"], teacher: "关老师 · 继续教育中心", phone: "0459-5812xxxx", email: "jxjy@dzu.example.edu.cn" },
      { time: "10-09 15:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "黑龙江省职业院校技能大赛报名摸底", desc: "2027 年省赛 10 个赛项，有意向同学到各系教务秘书处登记，学校统一集训。", majors: ["机电", "电子信息", "计算机", "经管"], teacher: "高老师 · 教务处", phone: "0459-5812xxxx", email: "jsjds@dqzy.example.edu.cn" }
    ]
  },
  {
    id: "s09", name: "东北农业大学", short: "东北农大",
    notices: [
      { time: "10-17 10:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生生命科学竞赛（CULSC）校内报名", desc: "2027 届报名启动，含科学研究类与创新创业类，实验类项目须提前预约动医实验室。", majors: ["医学", "综合类", "数理"], teacher: "丁老师 · 生命科学学院", phone: "0451-5519xxxx", email: "smkx@neau.example.edu.cn" },
      { time: "10-13 09:00", type: "校内竞赛", typeCat: "比赛类", tagColor: "", title: "「黑土地」智慧农业创新设计大赛", desc: "12 月校赛，围绕寒地种植、智慧养殖命题，特等奖直通省「互联网+」推荐名单。", majors: ["机电", "计算机", "综合类"], teacher: "姜老师 · 工程学院", phone: "0451-5519xxxx", email: "zhny@neau.example.edu.cn" }
    ]
  },
  {
    id: "s10", name: "哈尔滨理工大学", short: "哈理工",
    notices: [
      { time: "10-16 14:20", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "蓝桥杯（软件类+电子类）校内统一报名", desc: "两类别同步报名，11 月 5 日截止，学校报销 50% 报名费，周末集训营 10 月底开营。", majors: ["计算机", "电子信息", "数理"], teacher: "冯老师 · 计算机科学与技术学院", phone: "0451-8639xxxx", email: "lanqiao@hrbust.example.edu.cn" },
      { time: "10-12 11:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "华为ICT大赛（云/网络/昇腾AI 赛道）宣讲会", desc: "10 月 30 日报告厅，获奖可得华为认证券与实习直通，报名 11 月 30 日截止。", majors: ["计算机", "电子信息"], teacher: "石老师 · 软件学院", phone: "0451-8639xxxx", email: "ict@hrbust.example.edu.cn" }
    ]
  },
  {
    id: "s11", name: "佳木斯大学", short: "佳大",
    notices: [
      { time: "10-15 10:30", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "普通话水平测试（12 月批次）报名通知", desc: "12 月 13 日测试，面向师范类与有意考取教师资格的同学，报名截止 11 月 20 日。", majors: ["不限专业", "文法教育"], teacher: "邵老师 · 语言文字办", phone: "0454-861xxxx", email: "yyw@jmsu.example.edu.cn" },
      { time: "10-10 15:40", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "「挑战杯」红色专项校内预报名", desc: "围绕三江平原垦区红色资源开展社会调查，11 月组队，寒假集中实践。", majors: ["文法教育", "综合类", "艺术传媒"], teacher: "路老师 · 校团委", phone: "0454-861xxxx", email: "tzb@jmsu.example.edu.cn" }
    ]
  },
  {
    id: "s12", name: "齐齐哈尔大学", short: "齐大",
    notices: [
      { time: "10-16 09:50", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生广告艺术大赛（秋季赛）校内征集", desc: "围绕品牌命题创作，平面/视频/策划案均可，校内专家先评后推荐省赛。", majors: ["艺术传媒", "文法教育"], teacher: "柳老师 · 美术与艺术设计学院", phone: "0452-273xxxx", email: "ggds@qqhru.example.edu.cn" }
    ]
  },
  {
    id: "s13", name: "牡丹江师范学院", short: "牡师院",
    notices: [
      { time: "10-14 14:10", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "教师资格（笔试）冲刺辅导班报名", desc: "11 月 1 日笔试，考前两周每晚集中辅导，地点综合楼 302，免费参加。", majors: ["文法教育", "综合类", "外语"], teacher: "关老师 · 教师教育学院", phone: "0453-651xxxx", email: "jszg@mdjnu.example.edu.cn" }
    ]
  },
  {
    id: "s14", name: "黑龙江八一农垦大学", short: "八一农大",
    notices: [
      { time: "10-15 15:30", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生数学建模竞赛 2027 届预报名", desc: "2026 届省一队伍牵头组经验分享，12 月开设 MATLAB 快速入门训练营。", majors: ["数理", "计算机", "综合类"], teacher: "潘老师 · 理学院", phone: "0459-681xxxx", email: "shumo@byau.example.edu.cn" }
    ]
  },
  {
    id: "s15", name: "大庆师范学院", short: "庆师院",
    notices: [
      { time: "10-17 11:20", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国师范生教学技能竞赛校内选拔", desc: "11 月校内选拔，含模拟授课与三笔字测试，优胜者代表学校参加全国赛。", majors: ["文法教育", "外语", "综合类"], teacher: "纪老师 · 教务处", phone: "0459-551xxxx", email: "sfjs@dqsy.example.edu.cn" }
    ]
  },
  {
    id: "s16", name: "哈尔滨华德学院", short: "华德学院",
    notices: [
      { time: "10-16 16:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生智能汽车竞赛校内组队通知", desc: "2027 届报名 11 月 10 日开始，学校提供车模与焊接工位，校企合作导师参与指导。", majors: ["机电", "电子信息", "计算机"], teacher: "康老师 · 机器人工程学院", phone: "0451-8812xxxx", email: "zncar@huade.example.edu.cn" }
    ]
  },
  {
    id: "s17", name: "黑龙江东方学院", short: "东方学院",
    notices: [
      { time: "10-13 10:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "「三创赛」直播电商赛道校内组队", desc: "与本地 MCN 机构合作命题，主播/运营/数据方向均可报名，11 月校赛。", majors: ["经管", "艺术传媒", "计算机"], teacher: "谭老师 · 经济贸易学部", phone: "0451-8755xxxx", email: "sanchuang@dfxy.example.edu.cn" }
    ]
  },
  {
    id: "s18", name: "哈尔滨信息工程学院", short: "哈信息",
    notices: [
      { time: "10-18 09:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "华为ICT大赛（昇腾AI 方向）校内宣讲与组队", desc: "10 月 28 日华为工程师进校宣讲，报名团队可免费使用昇腾算力资源训练模型。", majors: ["计算机", "电子信息"], teacher: "侯老师 · 大数据系", phone: "0451-8862xxxx", email: "ict@hxc.example.edu.cn" }
    ]
  },
  {
    id: "s19", name: "黑龙江工程学院", short: "黑工程",
    notices: [
      { time: "10-15 09:40", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生测绘学科创新创业智能大赛报名", desc: "测绘技能与智能测绘两个赛项，校内测量实训场全天开放，11 月 20 日截止。", majors: ["机电", "电子信息", "综合类"], teacher: "安老师 · 测绘工程学院", phone: "0451-8802xxxx", email: "chgc@hljit.example.edu.cn" }
    ]
  },
  {
    id: "s20", name: "哈尔滨金融学院", short: "哈金融",
    notices: [
      { time: "10-14 10:20", type: "校内考试", typeCat: "考试类", tagColor: "green", title: "2027 年初级会计职称校内报名协助", desc: "金融学院组织统一报名与教材团购，1 月 24 日截止，错过再等一年。", majors: ["经管", "综合类"], teacher: "贺老师 · 会计系", phone: "0451-8668xxxx", email: "cjkz@hrbjr.example.edu.cn" }
    ]
  },
  {
    id: "s21", name: "哈尔滨医科大学", short: "哈医大",
    notices: [
      { time: "10-16 10:30", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生基础医学创新研究暨实验设计论坛报名", desc: "基础医学与临床前研究命题，须提交完整实验设计书，12 月校赛推荐。", majors: ["医学", "数理"], teacher: "郭老师 · 基础医学院", phone: "0451-8666xxxx", email: "jcyx@hrbmu.example.edu.cn" }
    ]
  },
  {
    id: "s22", name: "黑龙江中医药大学", short: "黑中医",
    notices: [
      { time: "10-17 15:00", type: "校外竞赛", typeCat: "比赛类", tagColor: "orange", title: "全国大学生中医药传统技能大赛选拔", desc: "含中药辨识、推拿、针灸三赛项，12 月校内选拔，寒假集中特训。", majors: ["医学"], teacher: "程老师 · 第一临床医学院", phone: "0451-8219xxxx", email: "zyjn@hljucm.example.edu.cn" }
    ]
  }
];

/* ---------- 用户搜索池（含好友与可搜索的陌生用户） ---------- */
DB.users = [
  { id: "u01", name: "阿澈", school: "哈工大", major: "计算机", avatar: "#2B5CFF", phone: "138****1234", account: "SZT-A1024", friend: true, online: true },
  { id: "u02", name: "Celine", school: "黑大", major: "外语", avatar: "#7C5CFF", phone: "139****5678", account: "SZT-B2048", friend: true, online: true },
  { id: "u03", name: "老K", school: "哈工程", major: "机电", avatar: "#00A8A0", phone: "137****9012", account: "SZT-C3007", friend: true, online: false },
  { id: "u04", name: "雪梨", school: "哈商大", major: "经管", avatar: "#F59E0B", phone: "136****3456", account: "SZT-D4102", friend: true, online: false },
  { id: "u05", name: "林间光", school: "东北林大", major: "文法教育", avatar: "#34A853", phone: "135****7890", account: "SZT-E5201", friend: true, online: true },
  { id: "u06", name: "Amber", school: "哈师大", major: "文法教育", avatar: "#FF7A59", phone: "133****2468", account: "SZT-F6139", friend: false, online: true },
  { id: "u07", name: "Felix", school: "东北林大", major: "数理", avatar: "#34A853", phone: "131****1357", account: "SZT-G7246", friend: false, online: false },
  { id: "u08", name: "启航老学长", school: "哈工大", major: "计算机", avatar: "#2B5CFF", phone: "130****8642", account: "SZT-H8351", friend: false, online: true },
  { id: "u09", name: "码上跑", school: "哈理工", major: "计算机", avatar: "#5B8CFF", phone: "132****9013", account: "SZT-I9462", friend: false, online: true },
  { id: "u10", name: "小熊猫", school: "哈工程", major: "数理", avatar: "#00A8A0", phone: "155****7531", account: "SZT-J0573", friend: false, online: false },
  { id: "u11", name: "波形不抖", school: "黑科大", major: "电子信息", avatar: "#F59E0B", phone: "156****1597", account: "SZT-K1684", friend: false, online: true },
  { id: "u12", name: "追梦人", school: "大庆职院", major: "机电", avatar: "#FF7A59", phone: "157****2590", account: "SZT-L2795", friend: false, online: true },
  /* ---- 教师用户（官方账号，可主页/私信/咨询） ---- */
  { id: "u-t01", name: "王老师", school: "哈尔滨工业大学", dept: "计算机学院", title: "副教授", major: "计算机", avatar: "#2B5CFF", account: "SZT-T101", teacher: true, online: true, intro: "ACM 程序设计竞赛集训队指导教师，带队获亚洲区域赛奖牌 3 枚，擅长算法竞赛、数学建模。", dirs: ["算法竞赛", "数学建模"], phone: "0451-8641xxxx" },
  { id: "u-t02", name: "李老师", school: "哈尔滨工业大学", dept: "软件学院", title: "讲师", major: "计算机", avatar: "#5B8CFF", account: "SZT-T102", teacher: true, online: false, intro: "蓝桥杯校内负责教师，负责软件类报名组织与集训营，擅长 Java / Web 方向。", dirs: ["软件开发", "蓝桥杯"], phone: "0451-8641xxxx" },
  { id: "u-t03", name: "张老师", school: "哈尔滨工业大学", dept: "语言文字工作委员会", title: "副教授", major: "文法教育", avatar: "#34A853", account: "SZT-T103", teacher: true, online: true, intro: "负责全校普通话水平测试组织工作，长期担任教资、语言类考试辅导。", dirs: ["普通话", "教师资格"], phone: "0451-8641xxxx" },
  { id: "u-t04", name: "赵老师", school: "哈尔滨工业大学", dept: "校团委科创部", title: "讲师", major: "综合类", avatar: "#00A8A0", account: "SZT-T104", teacher: true, online: true, intro: "校团委科创部主管，「挑战杯」「互联网+」等创新创业赛事的校内组织人，擅长项目打磨与路演辅导。", dirs: ["创新创业", "路演"], phone: "0451-8641xxxx" },
  { id: "u-t05", name: "陈老师", school: "哈尔滨工程大学", dept: "校团委", title: "讲师", major: "机电", avatar: "#00A8A0", account: "SZT-T105", teacher: true, online: false, intro: "「三海一核」科技创新作品征集负责人，擅长船海核方向科研项目孵化。", dirs: ["三海一核", "科技创新"], phone: "0451-8251xxxx" },
  { id: "u-t06", name: "孙老师", school: "哈尔滨工程大学", dept: "智能科学学院", title: "副教授", major: "电子信息", avatar: "#2B5CFF", account: "SZT-T106", teacher: true, online: true, intro: "全国大学生电子设计竞赛校内负责人，指导学生获国赛一等奖 2 次，开放实验室指导硬件项目。", dirs: ["电子设计", "嵌入式"], phone: "0451-8251xxxx" },
  { id: "u-t07", name: "周老师", school: "黑龙江大学", dept: "英语学院", title: "副教授", major: "外语", avatar: "#7C5CFF", account: "SZT-T107", teacher: true, online: true, intro: "「外研社·国才杯」校队教练，指导学生获全国特等奖 1 人、省级奖项 20+，擅长演讲与口语。", dirs: ["英语演讲", "口译"], phone: "0451-8660xxxx" },
  { id: "u-t08", name: "吴老师", school: "黑龙江大学", dept: "大学外语教研部", title: "讲师", major: "外语", avatar: "#7C5CFF", account: "SZT-T108", teacher: true, online: false, intro: "全国大学生英语竞赛（NECCS）校内负责人，组织真题模考与备考营，C 类辅导经验丰富。", dirs: ["英语竞赛", "四六级"], phone: "0451-8660xxxx" },
  { id: "u-t09", name: "马老师", school: "哈尔滨商业大学", dept: "商学院", title: "教授", major: "经管", avatar: "#F59E0B", account: "SZT-T109", teacher: true, online: true, intro: "三创赛、学创杯校赛总指导，企业导师资源丰富，擅长电商直播与商业模式设计。", dirs: ["电子商务", "创业模拟"], phone: "0451-8484xxxx" },
  { id: "u-t10", name: "林老师", school: "东北林业大学", dept: "理学院", title: "教授", major: "数理", avatar: "#34A853", account: "SZT-T110", teacher: true, online: true, intro: "数学建模国赛一等奖指导教练，主持数模训练营与 MATLAB 快速入门课程。", dirs: ["数学建模", "最优化"], phone: "0451-8219xxxx" },
  { id: "u-t11", name: "白老师", school: "大庆职业学院", dept: "智能制造学院", title: "高级讲师", major: "机电", avatar: "#FF7A59", account: "SZT-T111", teacher: true, online: true, intro: "职业技能大赛与 1+X 证书负责人，指导学生在省职业技能大赛获奖，专注技能实操训练。", dirs: ["职业技能", "智能制造"], phone: "0459-5812xxxx" },
  { id: "u-t12", name: "迟老师", school: "大庆职业学院", dept: "电气工程系", title: "讲师", major: "机电", avatar: "#F59E0B", account: "SZT-T112", teacher: true, online: false, intro: "西门子杯智能制造挑战赛指导教师，开放 PLC 实训室，带队获省一等奖 3 次。", dirs: ["智能制造", "PLC"], phone: "0459-5812xxxx" }
];

/* ---------- 好友（由用户池派生） ---------- */
DB.friends = DB.users.filter(u => u.friend);

/* ---------- 社区帖子 ---------- */
DB.posts = [
  { id: "p01", channel: "public", author: { name: "阿澈", school: "哈工大", avatar: "#2B5CFF", uid: "u01" }, time: "26 分钟前",
    content: "找数模队友！本人负责建模（国一经验），还差一名编程手（Python/MATLAB）和一名论文手。目标 2027 届国赛一等奖，9 月国赛结束后即可开始备赛。风格不卷，但求靠谱，最好大二以上。", need: "组队",
    tags: ["数学建模", "国赛冲奖"],
    likes: 34, comments: [
      { name: "小熊猫", text: "编程手报名！leetcode 300+，会 Gurobi" },
      { name: "林间光", text: "论文手可以吗，中文系但写过两次国赛论文" }
    ] },
  { id: "p02", channel: "public", author: { name: "Celine", school: "黑大", avatar: "#7C5CFF", uid: "u02" }, time: "1 小时前",
    content: "蓝桥杯 Java 组有没有一起刷题的？每天晚上 8-9 点互 check 三道题，省赛一等奖为目标，目前洛谷牛客都在刷。私我拉群！", need: "打卡组",
    tags: ["蓝桥杯", "Java"],
    likes: 21, comments: [
      { name: "码上跑", text: "已私，求带" }
    ] },
  { id: "p03", channel: "public", author: { name: "老K", school: "哈工程", avatar: "#00A8A0", uid: "u03" }, time: "3 小时前",
    content: "电赛 2027 校队招新：模拟组缺 2 人。要求会 Altium Designer，做过电源或信号类课程设计优先。我们组有 2025 届省一保底，进队即分任务，实验室工位、示波器随便用。", need: "组队",
    tags: ["电子设计", "校队招新"],
    likes: 56, comments: [
      { name: "波形不抖", text: "做过 Buck-Boost 课设，已私！" },
      { name: "小电阻", text: "大三还收吗" }
    ] },
  { id: "p04", channel: "public", author: { name: "雪梨", school: "哈商大", avatar: "#F59E0B", uid: "u04" }, time: "5 小时前",
    content: "专升本上岸经验分享 + 2027 届备考群。我 2026 届 258 分上岸黑科大计算机，把整理的计算机基础思维导图和高数错题集都放群里了。26 年 10 月 25 日就要报名，26、27 届的学弟学妹抓紧！", need: "交流",
    tags: ["专升本", "经验分享"],
    likes: 89, comments: [
      { name: "专科人专科魂", text: "已进群，感谢学姐" },
      { name: "追梦", text: "报名开始会有提醒吗" }
    ] },
  { id: "p05", channel: "public", author: { name: "Amber", school: "哈师大", avatar: "#FF7A59", uid: "u06" }, time: "8 小时前",
    content: "教资面试搭子求组！笔试已过（初中英语），12 月报面试。想找人练结构化问答和试讲，最好线上腾讯会议，每周 3 次，互相当评委。", need: "组队",
    tags: ["教师资格", "面试备考"],
    likes: 18, comments: [] },
  { id: "p06", channel: "public", author: { name: "Felix", school: "东北林大", avatar: "#34A853", uid: "u07" }, time: "昨天 20:14",
    content: "「挑战杯」校赛找队友！方向：面向东北林区火险预警的多源数据融合。我负责算法，缺硬件搭建和学术写作的伙伴。已联系好指导老师（林学院崔老师），选题可以直接复用实验室数据。", need: "组队",
    tags: ["挑战杯", "学术论文"],
    likes: 45, comments: [
      { name: "传感器坏了", text: "硬件我可以，已私" }
    ] },
  { id: "p07", channel: "school", school: "哈尔滨工业大学", author: { name: "启航老学长", school: "哈工大", avatar: "#2B5CFF", uid: "u08" }, time: "2 小时前",
    content: "启航杯热身赛第一场 11 月 1 日晚开打！出题人是上届冠军队，题目难度参考去年。大一的同学别怕，热身赛不计成绩，纯属体验，AC 零题也能领参与证书。有问题评论区问我。", need: "通知",
    tags: ["启航杯", "新生赛"],
    likes: 27, comments: [
      { name: "大一萌新", text: "请问用 C 语言还是 Python 好" },
      { name: "启航老学长", text: "都可以，正式赛支持 C++/Java/Python 三种" }
    ] },
  { id: "p08", channel: "school", school: "哈尔滨工业大学", author: { name: "小机器人", school: "哈工大", avatar: "#5B8CFF" }, time: "昨天 16:02",
    content: "蓝桥杯校内补贴报名已开始（学院补贴 50% 报名费）。报名截止 11 月 5 日，统一从赛证通「我的预赛」里加提醒，别错过！周三晚训练赛见。", need: "通知",
    tags: ["蓝桥杯", "校内报名"],
    likes: 33, comments: [] },
  { id: "p09", channel: "school", school: "黑龙江大学", author: { name: "英语角值班喵", school: "黑大", avatar: "#7C5CFF" }, time: "昨天 09:30",
    content: "新生英语演讲比赛 11 月 5 日截止报名！定题 My Digital Campus，稿子可以拿到英语角免费润色，值班时间每晚 18:30-20:30，图书馆负一层。", need: "通知",
    tags: ["英语演讲", "新生赛"],
    likes: 15, comments: [
      { name: "想报名的社恐", text: "润色真的免费吗！！" }
    ] },
  { id: "p10", channel: "school", school: "大庆职业学院", author: { name: "追梦人", school: "大庆职院", avatar: "#FF7A59", uid: "u12" }, time: "1 小时前",
    content: "西门子杯校内组队！我们组做智能产线仿真，缺一个会 TIA Portal 的队友，指导老师是迟老师。学校实训室晚上对参赛队开放，冲企业赛实习直通！", need: "组队",
    tags: ["西门子杯", "智能制造"],
    likes: 12, comments: [] },
  /* ---- 教师官方召集帖（教师端组队辅助示例） ---- */
  { id: "p11", channel: "school", school: "哈尔滨工业大学", author: { name: "王老师", school: "哈工大", avatar: "#2B5CFF", uid: "u-t01", teacher: true }, time: "30 分钟前",
    content: "【官方召集】ACM 集训队 2027 冬训补录 4 人。要求：掌握 C++/Python 基础、周训练量 ≥8 小时。集训队近期获区域赛银牌，目标下届晋级 World Finals。有意者评论区报名或直接私信我。", need: "官方召集",
    tags: ["ACM", "校队选拔", "算法"],
    likes: 68, comments: [
      { name: "大二卷王", text: "王老师，我是大二计算机的，打过 CCPC 铜牌，可以试训吗" },
      { name: "王老师", text: "可以，周三晚机房 305 来试训赛，题目偏图论。", teacher: true }
    ] },
  { id: "p12", channel: "school", school: "哈尔滨工程大学", author: { name: "孙老师", school: "哈尔滨工程大学", uid: "u-t06", teacher: true }, time: "2 小时前",
    content: "【官方召集】电赛 2027 校队招募：模拟组 2 人 / 控制组 2 人 / 视觉组 1 人。实验室已备好工位、示波器与 2025 届真题，零基础但有热情也欢迎来旁听。报名走校内通知的登记表，遇到问题私信我。", need: "官方召集",
    tags: ["电子设计", "校队招新"],
    likes: 41, comments: [
      { name: "波形不抖", text: "孙老师，控制组我可以！做过 PID 小车课设" },
      { name: "孙老师", text: "好，周六上午实验楼 3F 面试，带上你的课设代码。", teacher: true }
    ] },
  { id: "p13", channel: "school", school: "黑龙江大学", author: { name: "周老师", school: "黑龙江大学", uid: "u-t07", teacher: true }, time: "5 小时前",
    content: "【官方召集】外研社·国才杯 2027 校队选拔启动：演讲赛道 3 人 / 写作赛道 3 人。校赛 11 月 20 日举行，优秀者进入校队备战省赛。面试环节含即兴问答，英语角可预约辅导，想冲击省奖的同学抓紧私信我报名。", need: "官方召集",
    tags: ["英语演讲", "校队选拔"],
    likes: 39, comments: [
      { name: "Celine", text: "周老师，BEC 中级过了可以报演讲赛道吗" },
      { name: "周老师", text: "可以，语言能力够硬即可，重点是思辨，欢迎。", teacher: true }
    ] },
  { id: "p14", channel: "school", school: "大庆职业学院", author: { name: "迟老师", school: "大庆职业学院", uid: "u-t12", teacher: true }, time: "昨天 19:40",
    content: "【官方召集】西门子杯校内集训队招募：智能产线仿真方向 5 人，会 TIA Portal 或愿意从零学起的同学均可报名。培训 12 月启动，获奖可获企业实习优先通道。实训室晚间开放，私信我了解考核内容。", need: "官方召集",
    tags: ["西门子杯", "智能制造"],
    likes: 24, comments: [
      { name: "追梦人", text: "迟老师班里的，我们组队帖也发了，白老师这里求收留！" }
    ] }
];

/* ---------- 组队群聊 ---------- */
DB.groups = [
  { id: "g01", name: "挑战杯·林火预警项目组", members: 4, avatar: "#2B5CFF",
    msgs: [
      { from: "Felix", text: "崔老师那边数据集已经拿到了，今晚 8 点碰选题分工？" },
      { from: "传感器坏了", text: "硬件方案我先出两版，传感器清单周五前发群里" },
      { from: "我", text: "算法侧我先把基线模型跑通" },
      { from: "Felix", text: "好，校赛报名 11 月 15 日开始，我们 11 月 10 日前定稿摘要" }
    ] },
  { id: "g02", name: "数模冲奖小队（2027）", members: 6, avatar: "#00A8A0",
    msgs: [
      { from: "小熊猫", text: "Gurobi 的 license 我搞定了，每人都能跑" },
      { from: "阿澈", text: "周二晚来一场 2025B 的全真模拟，计时 72h 那种太长，先来 6h 精简版" },
      { from: "我", text: "带我一个，论文模板我带" }
    ] },
  { id: "g03", name: "蓝桥杯 Java 打卡群", members: 12, avatar: "#F59E0B",
    msgs: [
      { from: "码上跑", text: "今日题：周一 3 题，我 AC 了 2.5 道（最后一题超时）" },
      { from: "Celine", text: "冲冲冲，我 3 道全过，优化了 DP" }
    ] }
];

/* ---------- 教师指导群（kind: "guide"，按学校展示，学生可在社区-本校-指导群聊 加入） ---------- */
DB.groups.push(
  { id: "g-t01", kind: "guide", name: "蓝桥杯校队集训群", members: 18, avatar: "#2B5CFF",
    school: "哈尔滨工业大学", teacher: "李老师 · 软件学院", evId: "c01",
    desc: "每周三晚训练赛，李老师现场答疑；统一指导校内报名与费用补贴申领，省赛前组织 3 轮全真模拟。",
    msgs: [
      { from: "李老师", text: "本周三晚 7 点训练赛，C/C++ 组做 2025 真题，提前 10 分钟到活动中心 201。" },
      { from: "码上跑", text: "收到！报名表我已经在赛证通详情页提交了" },
      { from: "李老师", text: "好，报名截止 11-05，补贴名单周五公示，别卡最后一天。" }
    ] },
  { id: "g-t02", kind: "guide", name: "ACM 集训队冬训群", members: 9, avatar: "#7C5CFF",
    school: "哈尔滨工业大学", teacher: "王老师 · 计算机学院", evId: "c02",
    desc: "面向大二队员补录，周五晚机房 305 选拔训练；区域赛报名 10-25 截止，群内统一组队报名。",
    msgs: [
      { from: "王老师", text: "冬训补录选拔周五晚 6:30 机房 305，图论专题，带电脑即可。" },
      { from: "大二卷王", text: "老师，CCPC 铜牌可以直通试训吗？" },
      { from: "王老师", text: "可以，周三先来打一场热身赛看看状态。" }
    ] },
  { id: "g-t03", kind: "guide", name: "四六级听力冲刺群", members: 34, avatar: "#00A8A0",
    school: "哈尔滨工业大学", teacher: "董老师 · 外语学院", evId: "e01",
    desc: "12 月 19 日笔试前，每周二、四晚主楼语音室集中听力训练，群内发预约码与机考模拟资料。",
    msgs: [
      { from: "董老师", text: "今晚 18:30 听力集训照常，内容是 2025 年 6 月真题 Section B。" },
      { from: "想报名的社恐", text: "老师，机考模式和笔试差别大吗？" },
      { from: "董老师", text: "听力流程一致，我群里发了模拟系统链接，先适应一遍。" }
    ] },
  { id: "g-t04", kind: "guide", name: "挑战杯科创项目组群", members: 15, avatar: "#F59E0B",
    school: "哈尔滨工业大学", teacher: "赵老师 · 校团委科创部", evId: "c04",
    desc: "校赛报名 11-15 启动，赵老师负责选题打磨与路演指导，群内同步往届获奖作品与模板。",
    msgs: [
      { from: "赵老师", text: "本周五路演门诊，需要过 PPT 的队伍把初稿发群里预约时段。" },
      { from: "传感器坏了", text: "已发初稿，求 14:00 时段！" },
      { from: "赵老师", text: "收到，14:00 准时，重点改问题定义那两页。" }
    ] },
  { id: "g-t05", kind: "guide", name: "电赛校队训练营", members: 12, avatar: "#2B5CFF",
    school: "哈尔滨工程大学", teacher: "孙老师 · 智能科学学院", evId: "c07",
    desc: "2027 届电赛备战，模拟/控制/视觉三组招新；实验室工位与 2025 真题已备好，零基础可旁听。",
    msgs: [
      { from: "孙老师", text: "周六上午实验楼 3F 面试，控制组同学带上 PID 小车课设代码。" },
      { from: "波形不抖", text: "报告！Buck-Boost 课设也带了" }
    ] },
  { id: "g-t06", kind: "guide", name: "外研社国才杯校队群", members: 11, avatar: "#7C5CFF",
    school: "黑龙江大学", teacher: "周老师 · 英语学院", evId: "c09",
    desc: "演讲/写作双赛道校队选拔，11-20 校赛；面试含即兴问答，英语角可预约一对一辅导。",
    msgs: [
      { from: "周老师", text: "即兴问答题库已发群文件，每天练 2 题，录 1 分钟语音自评。" },
      { from: "Celine", text: "BEC 中级裸过，报演讲赛道没问题吧？" },
      { from: "周老师", text: "语言够硬就行，思辨多练，欢迎。" }
    ] },
  { id: "g-t07", kind: "guide", name: "教资面试备考群", members: 27, avatar: "#FF7A59",
    school: "哈尔滨师范大学", teacher: "何老师 · 教师教育学院", evId: "e05",
    desc: "11-01 笔试后无缝衔接面试备考，每周 3 场结构化问答 + 试讲互评，何老师逐人点评。",
    msgs: [
      { from: "何老师", text: "今晚结构化专题：课堂突发事件。先自己录一遍再听回放。" },
      { from: "Amber", text: "试讲 10 分钟的教案模板能再发一次吗？" },
      { from: "何老师", text: "已置顶，注意板书别背对考官太久。" }
    ] },
  { id: "g-t08", kind: "guide", name: "西门子杯集训群", members: 8, avatar: "#F59E0B",
    school: "大庆职业学院", teacher: "迟老师 · 电气工程系", evId: "c21",
    desc: "智能产线仿真方向 5 人集训队，TIA Portal 从零教起，获奖可获西门子实习优先通道。",
    msgs: [
      { from: "迟老师", text: "实训室晚间开放到 22 点，TIA Portal 安装包群文件自取。" },
      { from: "追梦人", text: "老师，仿真模型卡在传送带那段了" },
      { from: "迟老师", text: "今晚 8 点来实训室，我带你查信号。" }
    ] },
  { id: "g-t09", kind: "guide", name: "三创赛组队指导群", members: 14, avatar: "#FF7A59",
    school: "哈尔滨商业大学", teacher: "马老师 · 商学院", evId: "c12",
    desc: "直播电商 / 跨境电商选题组队，企业导师全程跟队，12 月校赛前完成商业计划书初稿。",
    msgs: [
      { from: "马老师", text: "本周六企业导师进群答疑，直播电商选题的队伍先发一页纸设想。" },
      { from: "小熊猫", text: "我们想做黑龙江农产品直播，已发设想！" }
    ] },
  { id: "g-t10", kind: "guide", name: "数模训练营群", members: 22, avatar: "#34A853",
    school: "东北林业大学", teacher: "林老师 · 理学院", evId: "c06",
    desc: "2027 届国赛备战，MATLAB 快速入门 + 6 小时精简模拟赛，获奖学长带队分享写作经验。",
    msgs: [
      { from: "林老师", text: "周二晚 2025B 题 6 小时精简模拟，三人一队，报名接龙。" },
      { from: "阿澈", text: "国一经验帖已转群文件，论文模板用新的。" }
    ] }
);

/* ---------- 私信预置回复 ---------- */
DB.chatReplies = [
  "收到！我最近也在准备这个比赛，晚上拉个腾讯会议细聊？",
  "在的在的，我看下赛证通上这个比赛的详情页，规则变动那里写得挺全的。",
  "可以呀，我加进「我的预赛」了，到时候开赛前互相提醒一下！",
  "我们队正好缺你这个方向，我把需求发你看看？",
  "哈哈哈好，说好了别鸽，周三训练赛见！",
  "这个赛道我知道，去年学长拿过省一，我把他的经验帖转你。"
];

/* ---------- 热门搜索词 ---------- */
DB.hotWords = ["蓝桥杯", "四六级报名时间", "专升本", "数学建模", "ACM", "教师资格证", "挑战杯", "计算机二级"];

/* ---------- 等级徽章映射 ---------- */
DB.levelBadge = { "国际级": "b-intl", "国家级": "b-national", "省级": "b-prov", "校级": "b-school", "国家认证": "b-cert", "国际认证": "b-cert", "行业认证": "b-cert" };

/* ---------- 初始用户 ---------- */
DB.initUser = {
  role: "",            // student / teacher（首次登录选择）
  nick: "星野",
  school: "",
  major: "计算机",
  skills: ["Python", "算法设计", "数据分析"],
  bio: "大二在读，竞赛冲奖中",
  studentNo: "",       // 学生认证：学号
  teacherNo: "",       // 教师认证：工号
  title: "",           // 教师职称
  guideDirs: []        // 教师指导方向
};

/* ---------- 初始收藏（我的预赛；c06 数模国赛 9 月已结束，用于演示“成绩自动归档”） ---------- */
DB.initFavs = ["c01", "e01", "c06"];

/* ---------- 初始教师推荐（学生端可见：本校教师/已添加教师推荐） ---------- */
DB.initRecs = [
  { evId: "c01", teacher: "李老师", teacherId: "u-t02", school: "哈尔滨工业大学", note: "算法基础扎实、想走软开方向的同学建议冲一下，校内有 50% 报名费补贴，训练赛每周三晚。", time: "10-18" },
  { evId: "c02", teacher: "王老师", teacherId: "u-t01", school: "哈尔滨工业大学", note: "ACM 集训队带队老师推荐：有 C++ 基础的大二同学可以组队冲区域赛，集训队可提供训练资源。", time: "10-17" },
  { evId: "c04", teacher: "赵老师", teacherId: "u-t04", school: "哈尔滨工业大学", note: "校团委科创部推荐：有科研项目或创业想法的大三大四同学重点关注，保研、评优加分明显。", time: "10-16" },
  { evId: "e01", teacher: "董老师", teacherId: "", school: "哈尔滨工业大学", note: "外语学院老师建议：大二前拿下四六级更从容，校内每周二、四晚有听力集训，可扫码预约。", time: "10-15" },
  { evId: "c10", teacher: "林老师", teacherId: "u-t10", school: "东北林业大学", note: "数模训练营教练推荐：数学建模是性价比很高的综合竞赛，理工科建议大二参加一次完整赛季。", time: "10-14" }
];

/* ---------- 初始消息 ---------- */
DB.initMsgs = [
  { id: "m01", kind: "sign", time: "10-18 09:00", read: false,
    title: "蓝桥杯报名即将截止", icon: "mi-red",
    desc: "第十八届蓝桥杯报名截止时间为 11-05，距截止还有 17 天。完成缴费后请保存报名号。",
    ref: "c01" },
  { id: "m02", kind: "sign", time: "10-19 08:30", read: false,
    title: "CET-6 考试临近", icon: "mi-orange",
    desc: "2026 下半年四六级笔试 12-19 举行，距考试还有 61 天。准考证 12 月初打印。",
    ref: "e01" },
  { id: "m03", kind: "sys", time: "10-19 08:31", read: true,
    title: "欢迎来到赛证通", icon: "mi-blue",
    desc: "建议先完成身份认证并绑定学校，可第一时间收到校内赛事通知；把意向比赛加入「我的预赛」即可获得报名提醒。",
    ref: "" }
];

/* ================= v3.0 新增演示数据 ================= */

/* ---------- 学校简称 → 省份映射（公共频道省份筛选用） ---------- */
DB.schoolProvince = {
  "哈工大": "黑龙江", "哈工程": "黑龙江", "黑大": "黑龙江", "哈商大": "黑龙江", "东北林大": "黑龙江", "哈师大": "黑龙江",
  "黑科大": "黑龙江", "大庆职院": "黑龙江", "哈理工": "黑龙江", "八一农大": "黑龙江", "华德学院": "黑龙江", "东方学院": "黑龙江",
  "哈信息": "黑龙江", "黑工程": "黑龙江", "哈金融": "黑龙江", "哈医大": "黑龙江", "黑中医": "黑龙江", "东北农大": "黑龙江"
};
/* 公共频道既有帖子补省份标记 */
DB.posts.forEach(p => { if (p.channel === "public" && !p.province) p.province = DB.schoolProvince[p.author.school] || "黑龙江"; });

/* ---------- 外省演示帖（体现公共频道省份筛选效果） ---------- */
DB.posts.unshift(
  { id: "p15", channel: "public", province: "北京", author: { name: "北城学长", school: "北航", avatar: "#2B5CFF" }, time: "12 分钟前",
    content: "北京的蓝桥杯 / ACM 同学抱团！我大二拿过蓝桥杯省一，现在备战 ICPC 区域赛，找 1-2 名 C++ 队友长期训练，每周六线下打模拟赛，坐标学院路高校联盟机房。", need: "组队",
    tags: ["ACM", "算法竞赛"], likes: 41, comments: [
      { name: "cy同学", text: "同学院路的，求带！" }
    ] },
  { id: "p16", channel: "public", province: "上海", author: { name: "临港風", school: "上海海事", avatar: "#00A8A0" }, time: "40 分钟前",
    content: "数模美赛找队友！美赛 2027 年 1 月开赛，现有建模 + 论文两人，缺一名编程手（Python / MATLAB 均可）。寒假线上为主、赛前一周线下冲刺，目标 M 奖以上，欢迎上海高校同学私我。", need: "组队",
    tags: ["数学建模", "美赛"], likes: 27, comments: [] },
  { id: "p17", channel: "public", province: "广东", author: { name: "珠水听潮", school: "华南理工", avatar: "#F59E0B" }, time: "1 小时前",
    content: "「互联网+」国赛冲刺交流群开放加入！我们去年拿省金，整理了完整路演 BP 模板与评委问答库，广东高校同学都可进群交流，群文件自取，也欢迎跨校组队。", need: "交流",
    tags: ["互联网+", "创新创业"], likes: 63, comments: [
      { name: "广油小王", text: "已进群，模板太全了！" }
    ] },
  { id: "p18", channel: "public", province: "江苏", author: { name: "金陵小鹤", school: "南审", avatar: "#7C5CFF" }, time: "2 小时前",
    content: "教资面试搭子（南京）！笔试两科已过，报 2027 上半年面试，找同考初中数学的伙伴练结构化问答和试讲，线下图书馆或线上会议都行，每周固定两次。", need: "组队",
    tags: ["教师资格", "面试备考"], likes: 19, comments: [] },
  { id: "p19", channel: "public", province: "陕西", author: { name: "秦岭栈道", school: "西电", avatar: "#34A853" }, time: "3 小时前",
    content: "挑战杯校赛评审刚结束，我们团队的「古城墙监测无人机」项目拿了特等奖直推省赛。整理了从选题到答辩的全流程时间线，评论区留邮箱发你，也欢迎陕西高校同学交流组队。", need: "交流",
    tags: ["挑战杯", "经验分享"], likes: 52, comments: [
      { name: "长安客", text: "邮箱已留，恭喜！" }
    ] }
);

/* ---------- 班级群（kind: "class"，学生端 / 教师端均可见，支持置顶） ---------- */
DB.groups.push(
  { id: "g-k01", kind: "class", name: "计算机 2401 班", members: 32, avatar: "#34A853",
    msgs: [
      { from: "班长小林", text: "提醒：明天上午体能测试，8 点操场集合，全员参加计入综测。" },
      { from: "学习委员", text: "高数第三章作业延期到周日，没交的抓紧。" },
      { from: "我", text: "收到！" }
    ] },
  { id: "g-k02", kind: "class", name: "软件工程 2302 班", members: 28, avatar: "#F59E0B",
    msgs: [
      { from: "辅导员王老师", text: "本周五下午班级团建，地点松花江边，自愿报名接龙。" },
      { from: "阿泽", text: "报名 +1" },
      { from: "小鹿", text: "报名 +2，老师下雨会延期吗？" }
    ] }
);

/* ---------- 教师端「学生成绩单」演示数据（授权由学生自主控制） ---------- */
DB.demoScoreAuth = { u01: true, u08: false };
DB.demoScores = {
  u01: [
    { evId: "c06", name: "全国大学生数学建模竞赛", kind: "comp", date: "2026-09-11", result: "省级一等奖", rank: "黑龙江赛区第 6 名", note: "论文入选组委会优秀论文展示" },
    { evId: "e02", name: "CET-6", kind: "exam", date: "2026-06-14", result: "572 分", rank: "年级前 8%", note: "" }
  ],
  u08: [
    { evId: "c02", name: "ACM-ICPC 亚洲区域赛", kind: "comp", date: "2025-11-16", result: "铜牌", rank: "", note: "已毕业退役，作为征召参考保留" }
  ]
};
