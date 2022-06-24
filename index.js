import lodash from "lodash";
import {
	AtlasAlias
} from "./apps/xiaoyao_image.js";
import {
	versionInfo,
	help
} from "./apps/help.js";
import {
	Note
} from "./apps/Note.js"
import {
	rule as adminRule,
	updateRes,sysCfg,
	updateMiaoPlugin
} from "./apps/admin.js";
import { currentVersion } from "./components/Changelog.js";
export {
	updateRes,
	updateMiaoPlugin,
	versionInfo,sysCfg,
	help,
	AtlasAlias,
	Note
};

let rule = {
	versionInfo: {
		reg: "^#图鉴版本$",
		describe: "【#帮助】 喵喵版本介绍",
	},
	help: {
		reg: "^#图鉴(列表|帮助|help)$",
		describe: "查看插件的功能",
	},
	AtlasAlias: {
		reg: "#*(.*)(信息|图鉴|命座|天赋|突破|材料|特色料理|特殊料理)$",
		describe: "【刻晴信息、刻晴图鉴、刻晴突破、刻晴命座】角色信息图鉴", 
	},
	Note: {
		reg: "^#*(体力|树脂|查询体力|便笺|便签)$",
		describe: "体力",
	},
	...adminRule
};

lodash.forEach(rule, (r) => {
	r.priority = r.priority || 50;
	r.prehash = true;
	r.hashMark = true;
});

export {
	rule
};

console.log(`图鉴插件${currentVersion}初始化~`);
setTimeout(async function () {
  let msgStr = await redis.get("xiaoyao:restart-msg");
  if (msgStr) {
    let msg = JSON.parse(msgStr);
    await common.relpyPrivate(msg.qq, msg.msg);
    await redis.del("xiaoyao:restart-msg");
    let msgs = [`当前版本: ${currentVersion}`, `您可使用 #图鉴版本 命令查看更新信息`];
    await common.relpyPrivate(msg.qq, msgs.join("\n"));
  }
}, 1000);
