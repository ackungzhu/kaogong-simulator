// 离线试玩测试 v0.9.2 - 模拟真实玩家（精力不阻止学习）
const fs = require('fs');
const path = require('path');

function newPlayer() {
  return {
    stats: { study: 50, mood: 50, money: 50, relation: 50, sanity: 50 },
    energy: 80, energyMax: 80,
    hour: 8, day: 1, month: 3, daysPlayed: 0,
    studyHoursToday: 0, focusBlocks: 0, restedSinceBlock: true,
    status: 'healthy', napCount: 0,
  };
}

const ACTIONS = [
  { id: 'shuati', duration: 1.5, energy: -25, tag: '学习' },
  { id: 'wangke', duration: 1, energy: -15, tag: '学习' },
  { id: 'moyu', duration: 1, energy: 15, tag: '休闲' },
  { id: 'chifan_solo', duration: 0.5, energy: 12, tag: '休闲' },
  { id: 'yundong', duration: 1, energy: 10, tag: '休闲' },
  { id: 'ziyou', duration: 0.5, energy: 20, tag: '休闲' },
  { id: 'shuijiao', duration: 0.5, energy: 30, tag: '休闲' },
];

// 5.1 疲劳曲线
function fatigueCoef(h) {
  if (h < 4) return 1.0;
  if (h < 6) return 0.9;
  if (h < 8) return 0.8;
  if (h < 10) return 0.65;
  if (h < 12) return 0.5;
  return 0.4;
}

function simulateDay(player) {
  let actionsToday = [];
  let studyHours = 0;
  let studyPoints = 0;

  // 模拟一天：早晨6点起床，22:30前任意点行动
  // 早晨必吃早饭（精力+12），之后主要学习，每2-3h休息一次
  while (player.hour < 22.5) {
    const study = ACTIONS.find(a => a.id === 'shuati');
    const wangke = ACTIONS.find(a => a.id === 'wangke');
    const rest = ACTIONS.find(a => a.id === 'chifan_solo');

    let choice;
    // 早晨7点强制吃早饭
    if (player.hour < 7.5) {
      choice = rest;
    }
    // 精力极低时强制休息
    else if (player.energy < 10 && player.hour < 20) {
      const r = ACTIONS.filter(a => a.tag === '休闲' && a.energy > 0);
      choice = r.sort((a,b) => b.energy - a.energy)[0];
    }
    // 否则学（按效率）：学4h休息1h
    else {
      const recentStudy = player.studyHoursToday % 5;
      if (recentStudy >= 3.5 && player.hour < 20) {
        choice = rest;
      } else {
        // 选时间短的网课（效率高）
        choice = player.hour + 1 > 22 ? wangke : study;
      }
    }

    if (!choice) break;
    if (player.hour + choice.duration > 22.5) break;

    player.hour += choice.duration;
    player.energy = Math.max(0, Math.min(100, player.energy + choice.energy));

    if (choice.tag === '学习') {
      studyHours += choice.duration;
      player.studyHoursToday += choice.duration;
      const coef = fatigueCoef(player.studyHoursToday);
      studyPoints += 5 * coef;
    }

    actionsToday.push(choice.id);
  }

  return { studyHours, studyPoints: Math.round(studyPoints), actionsCount: actionsToday.length };
}

function simulateGame() {
  const player = newPlayer();
  let totalStudyHours = 0, totalStudyPoints = 0;
  let days = 0;
  for (let day = 1; day <= 60; day++) {
    player.hour = 6;
    player.energy = 80;
    player.studyHoursToday = 0;
    const r = simulateDay(player);
    totalStudyHours += r.studyHours;
    totalStudyPoints += r.studyPoints;
    days++;
    // 睡眠结算
    player.energy = 80;
  }
  return { totalStudyHours, totalStudyPoints, days, avgPerDay: (totalStudyHours/days).toFixed(1), avgPoints: (totalStudyPoints/days).toFixed(1) };
}

console.log('=== v0.9.2 离线试玩（精力不阻止学习，60天）===\n');
const results = [];
for (let i = 0; i < 50; i++) results.push(simulateGame());

const avgHours = (results.reduce((s,r) => s + parseFloat(r.avgPerDay), 0) / results.length).toFixed(2);
const avgPts = (results.reduce((s,r) => s + parseFloat(r.avgPoints), 0) / results.length).toFixed(1);

console.log(`跑局数: ${results.length}`);
console.log(`平均每日学习时长: ${avgHours}h ${avgHours < 4 ? '❌过低' : avgHours < 6 ? '⚠️偏低' : '✅'}`);
console.log(`平均每日复习收益: ${avgPts}`);
console.log(`用户目标: 6-13h/天`);

const report = {
  timestamp: new Date().toISOString(),
  version: 'v0.9.2',
  totalGames: results.length,
  metrics: { avgStudyHours: avgHours, avgStudyPoints: avgPts },
  verdict: parseFloat(avgHours) >= 6 ? '✅ 体力系统设计合理' : '❌ 仍需优化',
};
fs.writeFileSync(path.join(__dirname, 'devlog', 'auto_play_report.json'), JSON.stringify(report, null, 2));
console.log('\n报告已写入 devlog/auto_play_report.json');
