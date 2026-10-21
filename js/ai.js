/* ============================================================
   赛证通 · AI 助手「小赛」引擎
   能力：赛事查询 / 精准检索 / 智能推荐 / 对比分析
        规则解读 / 当前页面智能分析
   （本地规则引擎 + 数据驱动，演示版可无缝替换为真实大模型 API）
   ============================================================ */

const AI = {

  /* ---------- 对外主入口 ---------- */
  ask(text, ctx) {
    const q = (text || "").trim();
    if (!q) return this.fallback();

    // 1. 页面分析
    if (/分析.*(页面|当前)|解读.*(页面|当前)|看看.*(页面|当前)|当前页面/.test(q)) return this.analyzePage(ctx);

    // 2. 对比
    if (/对比|比较|VS|vs\b|和.*哪个/.test(q)) {
      const pair = this.pickTwo(q);
      if (pair) return this.compare(pair[0], pair[1]);
    }

    // 3. 规则解读
    if (/规则|变动|变化|改革|新规|赛制/.test(q)) {
      const ev = this.matchEvent(q);
      if (ev) return this.ruleExplain(ev);
      return this.ruleDigest();
    }

    // 4. 推荐（结合用户专业）
    if (/推荐|适合我|帮我选|我该|建议我/.test(q)) return this.recommend(ctx);

    // 5. 闲聊
    if (/^(你好|您好|hi|hello|嗨|在吗|在不在)/i.test(q)) {
      return { text: "你好呀，我是小赛 🤖 我可以帮你查比赛、找证书考试、按专业推荐赛事，还能分析你正在看的页面。想查点什么？", events: [] };
    }
    if (/谢谢|感谢|辛苦/.test(q)) {
      return { text: "不客气！记得把心动的比赛加入「我的预赛」，我会按时间提醒你报名～", events: [] };
    }
    if (/你是谁|你能做什么|帮助|功能/.test(q)) return this.fallback();

    // 6. 具体赛事查询
    const ev = this.matchEvent(q);
    if (ev) return this.eventAnswer(ev, q);

    // 7. 分类 / 等级 / 关键词检索
    const list = this.searchEvents(q);
    if (list.length) {
      const kind = /证书|考证|考试|考试时间/.test(q) ? "考试" : (/比赛|竞赛|大赛/.test(q) ? "竞赛" : "项目");
      return {
        text: `为你找到 ${list.length} 个相关的${kind}，点击卡片可看详情：`,
        events: list.slice(0, 6)
      };
    }

    // 8. 兜底
    return this.fallback();
  },

  /* ---------- 事件匹配 ---------- */
  matchEvent(q) {
    let best = null, bestLen = 0;
    DB.events.forEach(ev => {
      const names = [ev.name, ev.short, ...(ev.tags || [])];
      names.forEach(n => {
        if (n.length >= 2 && q.includes(n) && n.length > bestLen) { best = ev; bestLen = n.length; }
      });
    });
    return best;
  },

  pickTwo(q) {
    const hits = [];
    DB.events.forEach(ev => {
      if (q.includes(ev.short) || q.includes(ev.name)) { if (!hits.includes(ev)) hits.push(ev); }
    });
    return hits.length >= 2 ? [hits[0], hits[1]] : null;
  },

  searchEvents(q) {
    const kw = q.replace(/查|找|搜索|请问|一下|帮我|有什么|哪些|报名|时间|截止|怎么|哪些/g, "");
    return DB.events.filter(ev => {
      const hay = [ev.name, ev.short, ev.category, ev.level, ev.organizer, (ev.tags || []).join(" ")].join(" ");
      return (!kw || hay.includes(kw)) &&
        (q.includes(ev.kind === "comp" ? "竞赛" : "考试") ? true : true);
    }).slice(0, 8);
  },

  /* ---------- 单个赛事回答 ---------- */
  eventAnswer(ev, q) {
    const st = evStatus(ev);
    let t = `**${ev.short}**（${ev.level}·${ev.category}类）\n\n${st.sign ? "报名时间：" + ev.signStart + " 至 " + ev.signEnd : "本季报名已结束"}\n${ev.kind === "comp" ? "比赛时间" : "考试时间"}：${ev.eventDate}（${st.text}）\n\n主办方：${ev.organizer}`;
    if (/时间|截止|报名|开始/.test(q) && !/介绍|详情|规则/.test(q)) {
      t += `\n\n${st.daysNote}`;
    }
    if (ev.ruleChange) t += `\n\n📌 规则动态：${ev.ruleChange}`;
    return { text: t, events: [ev] };
  },

  /* ---------- 推荐 ---------- */
  recommend(ctx) {
    const major = (state.user && state.user.major) || "综合类";
    const pool = DB.events.filter(ev =>
      ev.majors.includes(major) || ev.majors.includes("不限专业") || ev.majors.includes("综合类")
    );
    const open = pool.filter(ev => ["sign", "soon"].includes(evStatus(ev).code));
    const rest = pool.filter(ev => !["sign", "soon"].includes(evStatus(ev).code));
    const list = open.concat(rest).slice(0, 5);
    return {
      text: `根据你的专业标签「${major}」，我从报名中和即将报名的赛事里挑了 ${list.length} 个：\n\n${list.map((ev, i) => `${i + 1}. ${ev.short}（${ev.level}，${evStatus(ev).text}）`).join("\n")}\n\n点击卡片看详情，加入「我的预赛」后会自动提醒你报名～`,
      events: list
    };
  },

  /* ---------- 对比 ---------- */
  compare(a, b) {
    const sa = evStatus(a), sb = evStatus(b);
    return {
      text: `给你对比一下这两个：\n\n【${a.short}】\n· 等级：${a.level}（${a.category}类）\n· ${sa.sign ? "报名：" + a.signEnd + " 截止" : "报名已结束"} ｜ ${sa.text}\n· ${a.past.length ? "往届规模：" + a.past[0].scale : "暂无往届数据"}\n${a.ruleChange ? "· 规则变动：" + a.ruleChange : ""}\n\n【${b.short}】\n· 等级：${b.level}（${b.category}类）\n· ${sb.sign ? "报名：" + b.signEnd + " 截止" : "报名已结束"} ｜ ${sb.text}\n· ${b.past.length ? "往届规模：" + b.past[0].scale : "暂无往届数据"}\n${b.ruleChange ? "· 规则变动：" + b.ruleChange : ""}\n\n💡 小结：${a.category === b.category ? "两者同属" + a.category + "方向，可按时间错峰都参加" : "两者方向不同，可按精力主攻一个"}；${(sa.code === "sign" || sb.code === "sign") ? "有一个正在报名期，优先处理" : "目前都不在报名期，先加入预赛跟踪提醒"}。`,
      events: [a, b]
    };
  },

  /* ---------- 规则解读 ---------- */
  ruleExplain(ev) {
    return {
      text: `关于「${ev.short}」的规则动态：\n\n${ev.ruleChange || "暂未收录规则变动信息。"}\n\n建议以主办方官网最新通知为准，我会在「详情页 → 赛事介绍」同步更新要点。`,
      events: [ev]
    };
  },

  ruleDigest() {
    const list = DB.events.filter(ev => ev.ruleChange).slice(0, 4);
    return {
      text: "最近几项值得关注的规则变动：\n\n" + list.map(ev => `· ${ev.short}：${ev.ruleChange}`).join("\n") + "\n\n想了解某一项的完整规则，直接告诉我名字就行。",
      events: list
    };
  },

  /* ---------- 当前页面智能分析 ---------- */
  analyzePage(ctx) {
    const c = ctx || {};
    switch (c.page) {
      case "home": {
        const favNear = state.favs.map(id => DB.events.find(e => e.id === id)).filter(Boolean)
          .map(ev => ({ ev, st: evStatus(ev) }))
          .filter(x => ["sign", "soon", "prep"].includes(x.st.code)).slice(0, 3);
        const openCount = DB.events.filter(ev => evStatus(ev).code === "sign").length;
        let t = `当前在【首页】。我看了下全局数据：\n\n· 正在报名中的项目有 ${openCount} 个；`;
        if (favNear.length) {
          t += `\n· 你的预赛里有 ${favNear.length} 个时间敏感：\n${favNear.map(x => "  - " + x.ev.short + "（" + x.st.text + "）").join("\n")}`;
          t += `\n\n建议优先处理 ⏰ ${favNear[0].ev.short}，${favNear[0].st.daysNote}。`;
        } else {
          t += "\n· 你的「我的预赛」暂无临近项目，可以让我按专业推荐几个。";
        }
        return { text: t, events: favNear.slice(0, 3).map(x => x.ev) };
      }
      case "category": {
        const f = c.filter || {};
        const list = filterEventsFor(f);
        const compN = list.filter(e => e.kind === "comp").length;
        const natN = list.filter(e => ["国家级", "国际级"].includes(e.level)).length;
        let t = `当前在【分类页】。筛选条件：${f.year || "全部年份"} ｜ ${f.major || "全部专业"} ｜ ${f.kind || "全部类型"}。\n\n· 命中 ${list.length} 个项目，其中竞赛 ${compN} 个、考试 ${list.length - compN} 个；\n· 高权威（国家级/国际级）占比 ${list.length ? Math.round(natN / list.length * 100) : 0}%。`;
        const signable = list.filter(e => ["sign", "soon"].includes(evStatus(e).code)).slice(0, 3);
        if (signable.length) t += `\n\n其中现在/马上能报名的有：${signable.map(e => e.short).join("、")}。`;
        return { text: t, events: signable };
      }
      case "detail": {
        const ev = DB.events.find(e => e.id === c.detailId);
        if (!ev) return { text: "页面好像刷新了，重新打开一个比赛我再帮你分析～", events: [] };
        const st = evStatus(ev);
        let t = `当前在看【${ev.short}】详情页，帮你划下重点：\n\n· 权威等级：${ev.level}（${ev.category}类，适合 ${ev.majors.join("/")}）；\n· ${st.sign ? "报名截止 " + ev.signEnd : "报名通道已关闭"}，${st.daysNote}；\n· ${ev.kind === "comp" ? "比赛时间" : "考试时间"}：${ev.eventDate}。`;
        if (ev.past && ev.past.length >= 2) {
          t += `\n\n📈 往届趋势：最近 ${ev.past.length} 届数据看，${ev.past[ev.past.length - 1].year} 年 → ${ev.past[0].year} 年规模${ev.past[0].scale >= ev.past[ev.past.length - 1].scale ? "持续扩大，竞争热度上升，早启动更稳" : "有所回落，获奖窗口期更从容"}。`;
        }
        if (ev.past && ev.past[0] && ev.past[0].award) t += `\n· 近届获奖面参考：${ev.past[0].award}。`;
        if (ev.ruleChange) t += `\n\n⚠️ 规则有变动：${ev.ruleChange}`;
        t += `\n\n${st.sign ? "建议：现在就加入「我的预赛」并开启提醒，别卡截止日最后一天。" : (st.code === "soon" ? "建议：把报名开始日加入预赛，开始当天我提醒你。" : "建议：可以先研读往届作品，为下一届做准备。")}`;
        return { text: t, events: [ev] };
      }
      case "community": {
        const tp = c.topic;
        const n = tp ? DB.posts.filter(p => (p.tags || []).some(t => t.includes(tp))).length : DB.posts.length;
        const teams = DB.posts.filter(p => p.need === "组队").length;
        return {
          text: `当前在【社区广场】${tp ? "，正在浏览 #" + tp + " 话题" : ""}。\n\n· ${tp ? "该话题下有 " + n + " 条组队相关帖子" : "当前共 " + n + " 条帖子"}，其中明确「组队」需求的有 ${teams} 条；\n· 组队帖高频关键词：队友、押题、冲刺、模考。\n\n想找队友的话，可以把你的专业标签填完整（我的 → 编辑资料），发帖时带上 #话题 更容易被搜到。`,
          events: []
        };
      }
      case "school": {
        if (!state.user.school) return { text: "当前在【校内页】，你还没绑定学校。绑定后可以看到校内竞赛、校内考试和本校可参加的校外竞赛通知，还可以直接查看指导老师联系方式。点「绑定学校」就能开始。", events: [] };
        const sch = DB.schools.find(s => s.name === state.user.school);
        return { text: `当前在【校内页】，你已绑定「${state.user.school}」。\n\n· 学校官方已发布 ${sch ? sch.notices.length : 0} 条通知；\n· 校级赛事在分类页也标注了「校级」徽章，含金量按 校级 < 省级 < 国家级 < 国际级 排列，但校级赛往往是晋级省赛、国赛的必经入口。`, events: [] };
      }
      case "me": case "myevents": {
        const favs = state.favs.map(id => DB.events.find(e => e.id === id)).filter(Boolean);
        const urgent = favs.map(ev => ({ ev, st: evStatus(ev) })).filter(x => ["sign", "soon"].includes(x.st.code));
        let t = `当前在【${c.page === "me" ? "我的" : "我的预赛"}】。\n\n· 预赛共 ${favs.length} 项（比赛 ${favs.filter(e => e.kind === "comp").length}、考试 ${favs.filter(e => e.kind === "exam").length}）；`;
        if (urgent.length) {
          t += `\n· 有 ${urgent.length} 项进入关键期：\n${urgent.map(x => "  - " + x.ev.short + "（" + x.st.text + "）").join("\n")}`;
        } else {
          t += "\n· 暂无一周内截止的报名，节奏不错。";
        }
        t += `\n\n已完成归档 ${state.done.length} 项，坚持记录会对择校、求职材料很有帮助。`;
        return { text: t, events: urgent.map(x => x.ev).slice(0, 3) };
      }
      default:
        return { text: "我在看着你的页面呢～不过这个页面暂时没有可分析的数据，换个页面再喊我试试？", events: [] };
    }
  },

  /* ---------- 身份化赛事速读（学生看赛点/注意事项，教师看指导方向） ---------- */
  eventBrief(ev, role) {
    if (!ev) return { text: "找不到这个赛事，换个试试～", events: [] };
    const st = evStatus(ev);
    const kind = ev.kind === "comp" ? "比赛" : "考试";
    const isTeacher = role === "teacher";
    const majors = (ev.majors || []).join("、");
    const hasPast = ev.past && ev.past.length;
    const latest = hasPast ? ev.past[0] : null;
    const materialN = (ev.materials || []).length;

    // ---- 学生视角：赛点 + 注意事项 ----
    if (!isTeacher) {
      let t = `来了！帮你看一眼「${ev.short}」这个${kind}，先把**赛点**和**注意事项**给你划重点：\n\n`;
      t += "🎯 **主要赛点（怎么拿分）**\n";
      t += `· 这是${ev.level}${ev.category}类${kind}，主办 ${ev.organizer}，适合 ${majors} 方向。\n`;
      t += `· 侧重考察「${ev.category}」方向的核心能力${ev.tags && ev.tags.length ? "，关键词：" + ev.tags.slice(0, 4).join("、") : ""}。\n`;
      if (latest) t += `· 近届数据参考：${latest.award}${latest.note ? "；" + latest.note : ""}。\n`;
      if (ev.ruleChange) t += `· ⚠️ 本届有规则变动：${ev.ruleChange.replace(/。$/, "")}。\n`;
      t += "\n📌 **注意事项**\n";
      t += `· 报名窗口：${ev.signStart || "—"} 至 ${ev.signEnd || "—"}（${st.text}）。\n`;
      if (materialN) t += `· 需准备 ${materialN} 项报名材料（${ev.materials.slice(0, 3).map(m => m.name).join("、")}等），提前备齐别卡点。\n`;
      t += `· ${kind}时间：${ev.eventDate}，注意考场/上机与携带证件要求。\n`;
      t += `· 建议 ${st.sign ? "现在就把报名做了，避免挤在截止日" : (st.code === "soon" ? "把报名开始日加入「我的预赛」，开始当天我提醒你" : (ev.kind === "comp" ? "先研读往届作品，为备赛定方向" : "对照考纲梳理薄弱项，制定复习计划"))}。`;
      return { text: t, events: [ev] };
    }

    // ---- 教师视角：指导方向 ----
    let t = `作为教师，我给你梳理一下怎么带学生准备「${ev.short}」这个${kind}：\n\n`;
    t += "🎓 **定位与价值**\n";
    t += `· ${ev.level}·${ev.category}类${kind}，含金量不错，可作为学生的备赛主线；主办方 ${ev.organizer}。\n`;
    if (latest) t += `· 往届规模 ${latest.scale}，通过/获奖面 ${latest.award}，据此可以帮学生定目标档位。\n`;
    t += "\n📌 **指导方向建议**\n";
    if (ev.kind === "comp") {
      t += `· 队伍构成：针对「${ev.category}」方向，${majors} 专业学生是主力，可考虑跨专业组队互补。\n`;
    } else {
      t += `· 备考对象：以 ${majors} 方向学生为主，可组织统一备考小组，按基础分层盯进度。\n`;
    }
    if (materialN) t += `· 报名材料：共 ${materialN} 项，可统一收齐（${ev.materials.slice(0, 3).map(m => m.name).join("、")}），降低学生遗漏风险。\n`;
    if (ev.ruleChange) t += `· ⚠️ 规则有变：${ev.ruleChange.replace(/。$/, "")}，需在${ev.kind === "comp" ? "选题/训练" : "备考/复习"}前同步给学生。\n`;
    t += `· 时间管理：${st.sign ? "报名截止 " + ev.signEnd + "（" + st.text + "），尽快组织报名" : "报名窗口 " + ev.signStart + " 至 " + ev.signEnd + "，提前规划备赛周期"}；${ev.kind === "comp" ? "比赛" : "考试"}时间 ${ev.eventDate}。\n`;
    t += "\n💡 **带队建议**\n";
    if (ev.kind === "comp") {
      t += `· 可以先在「社区 → 本校组队指导」发一篇官方召集帖，让有意向的学生报名组队；\n· 建立训练节奏：选题→材料→模拟答辩，每阶段定一个节点帮你跟踪。`;
    } else {
      t += `· 可以在「社区 → 本校组队指导」发备考小组召集帖，统一节奏、共享资料；\n· 建立备考节奏：摸底→专项→模考，每阶段定一个节点帮你跟踪。`;
    }
    return { text: t, events: [ev] };
  },

  /* ---------- 兜底 ---------- */
  fallback() {
    return {
      text: "我可以帮你做这些事：\n\n🔍 查赛事 —— 说「蓝桥杯」「四六级」「专升本」直接查\n🎯 找考试 —— 说「计算机相关的考试」「英语类比赛」\n💡 智能推荐 —— 说「推荐一些适合我的比赛」\n⚖️ 对比分析 —— 说「对比蓝桥杯和ACM」\n📖 规则解读 —— 说「蓝桥杯规则变动」\n👀 页面分析 —— 点下方「分析当前页面」，或对我说「分析当前页面」",
      events: []
    };
  }
};

/* ---------- 快捷指令 ---------- */
AI.chips = [
  { label: "分析当前页面", act: "page" },
  { label: "推荐适合我的比赛", act: "rec" },
  { label: "查英语类证书考试", act: "q:英语" },
  { label: "国家级竞赛有哪些", act: "q:国家级" },
  { label: "报名快截止的有哪些", act: "urgent" },
  { label: "蓝桥杯规则变了什么", act: "q:蓝桥杯规则" }
];
