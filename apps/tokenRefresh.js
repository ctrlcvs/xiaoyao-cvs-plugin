// 米游社 cookie_token 自动刷新模块
// 每隔 8-12 小时随机用 stoken 兑换最新 cookie_token, 更新 genshin 插件 sqlite 数据库(MysUsers.ck)
// 解决 cookie_token 过期导致签到失败(-100)的问题
import fs from 'fs';
import YAML from 'yaml';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const _path = process.cwd();
const yamlDir = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
const dbPath = `${_path}/data/db/data.db`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// stoken -> cookie_token 兑换
async function exchangeCookieToken(cfg) {
  const url = `https://api-takumi.mihoyo.com/auth/api/getCookieAccountInfoBySToken?stuid=${cfg.stuid}&stoken=${cfg.stoken}`;
  const res = await fetch(url, {
    headers: {
      'Cookie': `stuid=${cfg.stuid};stoken=${cfg.stoken};mid=${cfg.mid || ''};`,
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15'
    },
    timeout: 15000
  });
  let text = await res.text();
  if (text.startsWith('(')) text = text.replace(/^\(|\)$/g, '');
  const j = JSON.parse(text);
  if (j.retcode === 0 && j.data?.cookie_token) return j.data.cookie_token;
  throw new Error(`兑换失败: ${JSON.stringify(j).slice(0, 150)}`);
}

// 更新 sqlite MysUsers.ck
function updateCookie(ltuid, newCk) {
  return new Promise((resolve, reject) => {
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(dbPath);
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.run(
      `UPDATE MysUsers SET ck = ?, updatedAt = ? WHERE ltuid = ? AND type = 'mys'`,
      [newCk, ts, String(ltuid)],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// 刷新所有用户的 cookie_token
export async function refreshTokenCookie() {
  if (!fs.existsSync(yamlDir)) return { ok: 0, fail: 0, msgs: ['no yaml dir'] };
  const files = fs.readdirSync(yamlDir).filter(f => f.endsWith('.yaml'));
  const seen = new Set();
  let ok = 0, fail = 0;
  const msgs = [];
  for (const file of files) {
    let raw;
    try {
      raw = YAML.parse(fs.readFileSync(`${yamlDir}/${file}`, 'utf-8'));
    } catch (e) {
      msgs.push(`解析失败: ${file}`);
      continue;
    }
    const entries = Object.values(raw || {});
    for (const cfg of entries) {
      if (!cfg?.stoken || !cfg?.stuid) continue;
      const ltuid = String(cfg.stuid);
      if (seen.has(ltuid)) continue; // 同一通行证只刷新一次
      seen.add(ltuid);
      try {
        const cookieToken = await exchangeCookieToken(cfg);
        const newCk = `ltoken=${cfg.ltoken};ltuid=${ltuid};cookie_token=${cookieToken}; account_id=${ltuid};`;
        await updateCookie(ltuid, newCk);
        ok++;
        msgs.push(`✅ ${ltuid} cookie_token 已刷新`);
      } catch (e) {
        fail++;
        msgs.push(`❌ ${ltuid} 刷新失败: ${e.message}`);
      }
      await sleep(1500);
    }
  }
  try { Bot?.logger?.mark?.(`[tokenRefresh] cookie 刷新完成 成功${ok} 失败${fail}`); } catch (e) {}
  return { ok, fail, msgs };
}

// 注册定时任务: 每 8-12 小时随机执行一次
export function scheduleTokenRefresh() {
  const delayMs = (8 + Math.random() * 4) * 60 * 60 * 1000; // 8~12 小时
  setTimeout(async () => {
    try {
      await refreshTokenCookie();
    } catch (e) {
      try { Bot?.logger?.error?.(`[tokenRefresh] 出错: ${e.message}`); } catch (err) {}
    }
    scheduleTokenRefresh(); // 循环调度
  }, delayMs);
  return delayMs;
}