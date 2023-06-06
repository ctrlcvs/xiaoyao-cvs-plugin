import lodash from "lodash";
import schedule from "node-schedule";
import {
	AtlasAlias,getBasicVoide
} from "./xiaoyao_image.js";
import { srAtlasAlias} from './srGallery.js'
import {
	versionInfo,
	help
} from "./help.js";
import {
	rule as mapRule,
	genShenMap,delMapData
} from './map.js'
import {
	Note,
	DailyNoteTask,
	Note_appoint,
	noteTask,
	pokeNote
} from "./Note.js";
import {
	rule as adminRule,
	updateRes,
	sysCfg, updateTemp,
	updateMiaoPlugin
} from "./admin.js";

import {
	rule as userRule,
	delSign,
	updCookie,
	userInfo,
	gclog,
	mytoken, gcPaylog,
	bindStoken, bindLogin_ticket,
	cloudToken
} from "./user.js"
import {
	rule as signRule,
	sign,
	bbsSign,
	cloudSign,
	seach,
	cookiesDocHelp,
	signTask
} from "./sign.js"
import {
	rule as topupLoginRule,
	qrCodeLogin,UserPassMsg,UserPassLogin,payOrder
} from './mhyTopUpLogin.js'
export {
	updateRes, updateTemp,
	delSign, gcPaylog,delMapData,
	cloudSign,qrCodeLogin,
	seach, bindLogin_ticket,payOrder,
	bbsSign,UserPassMsg,UserPassLogin,
	gclog,
	mytoken, getBasicVoide,
	bindStoken,
	updateMiaoPlugin,
	userInfo,
	sign,
	versionInfo,
	cloudToken,
	Note_appoint,
	signTask,
	pokeNote,
	genShenMap,
	cookiesDocHelp,
	sysCfg,
	help,
	updCookie,
	DailyNoteTask,
	noteTask,
	AtlasAlias,srAtlasAlias,
	Note,
};
import gsCfg from '../model/gsCfg.js';
const _path = process.cwd();

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
	srAtlasAlias: {
		reg: "^((#|\\*)(.*)|.*图鉴)$",
		describe: "sr 星穹铁道武器信息图鉴",
	},
	Note: {
		reg: "^#*(多|全|全部)*(体力|树脂|查询体力|便笺|便签)$",
		describe: "体力",
	},
	noteTask: {
		reg: "^#*((开启|关闭)体力推送|体力设置群(推送(开启|关闭)|(阈值|上限)(\\d*)))$",
		describe: "体力推送",
	},
	Note_appoint: {
		reg: "^#(体力模板(设置(.*)|列表(.*))|(我的体力模板列表|体力模板移除(.*)))$",
		describe: "体力模板设置",
	},
	
	pokeNote: {
		reg: "#poke#",
		describe: "体力",
	},
	getBasicVoide: {
		reg: '#?(动态|幻影)',
		describe: "动态",
	},
	...userRule,
	...signRule,
	...adminRule,
	...topupLoginRule,
	...mapRule
};

lodash.forEach(rule, (r) => {
	r.priority = r.priority || 50;
	r.prehash = true;
	r.hashMark = true;
});
task();
//定时任务
async function task() {
	if (typeof test != "undefined") return;
	let set = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config")
	schedule.scheduleJob(set.mysBbsTime, function () {
		if (set.ismysSign) {
			signTask('bbs')
		}
	});
	schedule.scheduleJob(set.allSignTime, function () {
		if (set.isSign) {
			signTask('mys')
		}
	});
	schedule.scheduleJob(set.cloudSignTime, function () {
		if (set.isCloudSign) {
			signTask('cloud')
		}
	});
	schedule.scheduleJob(set.noteTask, function () {
		if (set.isNoteTask) {
			DailyNoteTask()
		}
	});
}


export {
	rule
};
