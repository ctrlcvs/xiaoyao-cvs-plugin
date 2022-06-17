// import {
//   character,
//   getProfile,
//   wife,
//   wifeReg,
//   enemyLv,
//   getArtis,
//   getProfileAll,
//   profileHelp
// } from "./apps/character.js";
// import { consStat, abyssPct, abyssTeam } from "./apps/stat.js";
// import { wiki, calendar } from "./apps/wiki.js";
// import { help, versionInfo } from "./apps/help.js";
// import lodash from "lodash";
// import common from "../../lib/common.js";
// import { rule as adminRule, updateRes, sysCfg, updateMiaoPlugin } from "./apps/admin.js";
// import { currentVersion } from "./components/Changelog.js";

// export {
//   character,
//   wife,
//   consStat,
//   abyssPct,
//   abyssTeam,
//   wiki,
//   updateRes,
//   updateMiaoPlugin,
//   sysCfg,
//   help,
//   versionInfo,
//   getProfile,
//   enemyLv,
//   getArtis,
//   getProfileAll,
//   profileHelp,
//   calendar
// };


// let rule = {
//   versionInfo: {
//     reg: "^#图鉴版本$",
//     describe: "【#帮助】 喵喵版本介绍",
//   },
//   calendar: {
//     reg: "^#图鉴列表$",
//     describe: "【#日历】 活动日历",
//   },
//   ...adminRule
// };

// lodash.forEach(rule, (r) => {
//   r.priority = r.priority || 50;
//   r.prehash = true;
//   r.hashMark = true;
// });

// export { rule };

// console.log(`图鉴${currentVersion}初始化~`);

// setTimeout(async function () {
//   let msgStr = await redis.get("miao:restart-msg");
//   if (msgStr) {
//     let msg = JSON.parse(msgStr);
//     await common.relpyPrivate(msg.qq, msg.msg);
//     await redis.del("miao:restart-msg");
//     let msgs = [`当前版本: ${currentVersion}`, `您可使用 #版本 命令查看更新信息`];
//     await common.relpyPrivate(msg.qq, msgs.join("\n"));
//   }
// }, 1000);