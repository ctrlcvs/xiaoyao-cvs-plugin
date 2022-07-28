import lodash from "lodash";
import {
	AtlasAlias
} from "./xiaoyao_image.js";
import {
	versionInfo,
	help
} from "./help.js";
import {
	Note,DailyNoteTask,
	Note_appoint,pokeNote
} from "./Note.js";
import {
	rule as adminRule,
	updateRes,
	sysCfg,
	updateMiaoPlugin
} from "./admin.js";
import {
	currentVersion
} from "../components/Changelog.js";
import {
	rule as signRule,
	sign,mysSign
} from "./sign.js"
export {
	updateRes,
	updateMiaoPlugin,sign,
	versionInfo,
	Note_appoint,pokeNote,
	sysCfg,
	help,DailyNoteTask,
	AtlasAlias,
	Note,mysSign
};

let rule = {
	versionInfo: {
		reg: "^#图鉴版本$",
		describe: "【#帮助】 图鉴版本介绍",
	},
	help: {
		reg: "^#?(图鉴)?(命令|帮助|菜单|help|说明|功能|指令|使用说明)$",
		describe: "查看插件的功能",
	},
	AtlasAlias: {
		reg: "^(#(.*)|.*图鉴)$",
		describe: "角色、食物、怪物、武器信息图鉴",
	},
	Note: {
		reg: "^#*(体力|树脂|查询体力|便笺|便签)$",
		describe: "体力",
	},
	Note_appoint: {
		reg: "^#体力模板(设置(.*)|列表)$",
		describe: "体力模板设置",
	},
	pokeNote: {
		reg: "#poke#",
		describe: "体力",
	},
	...signRule,
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