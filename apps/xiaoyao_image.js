import {
	segment
} from "oicq";
import fs from "fs";
import {
	Cfg
} from "../components/index.js";
import Data from "../components/Data.js"
import path from 'path';
import fetch from "node-fetch";
import gsCfg from '../model/gsCfg.js'
import {
	isV3
} from '../components/Changelog.js'
import utils from "../model/mys/utils.js";
const _path = process.cwd();
const __dirname = path.resolve();

const list = ["wuqi_tujian", "shiwu_tujian", "yuanmo_tujian", "mijin_tujian", "shengyiwu_tujian", "daoju_tujian"]
const reglist = ["(#|专武|武器|图鉴)", "(#|食物|特殊料理|特色|料理|食材|图鉴)", "(#|原魔|怪物|图鉴|信息)", "(#|秘境|信息|图鉴)", "(#|圣遗物|图鉴)",
	"(#|图鉴|道具)"
]
export async function AtlasAlias(e) {
	if (!Cfg.get("Atlas.all")) {
		return false;
	}
	let reg = /#(.*)/;
	if (Cfg.get("sys.Atlas")) {
		reg = /#*(.*)图鉴/;
	}
	if (!reg.test(e.msg)) {
		return false;
	}
	if (await Atlas_list(e)) return true;
	if (await roleInfo(e)) return true;
	if (await filePath(e)) return true;
	return send_Msg(e, "all", "");
}


export async function roleInfo(e) {
	let msg = e.msg.replace(/#|＃|信息|图鉴|命座|天赋/g, "");
	let Botcfg;
	let id;
	if (isV3) {
		Botcfg = (await import(`file://${_path}/plugins/genshin/model/gsCfg.js`)).default;
		id = Botcfg.roleNameToID(msg)
	} else {
		Botcfg = YunzaiApps.mysInfo
		id = Botcfg.roleIdToName(msg);
	}
	let name;
	if (["10000005", "10000007", "20000000"].includes(id)) {
		if (!["风主", "岩主", "雷主", "草主"].includes(msg)) {
			e.reply("请选择：风主图鉴、岩主图鉴、雷主图鉴、草主图鉴");
			return true;
		}
		name = msg;
	} else {
		name = Botcfg.roleIdToName(id, true);
		if (!name) return false;
	}
	send_Msg(e, "juese_tujian", name)
	return true;
}

const filePath = async function(e) {
	let data = list;
	data.push("juese_tujian")
	for (let [index, val] of data.entries()) {
		let msg=e.msg;
		if(index!=data.length-1){
			msg=e.msg.replace(new RegExp(reglist[index], "g"), "");
		}else {
			msg=e.msg.replace(/#|＃|信息|图鉴|命座|天赋/g, "");
		}
		let path = `${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/${val}/${msg}.png`
		if (fs.existsSync(path)) {
			e.reply(segment.image(`file:///${path}`));
			return true;
		}
	}
}

const send_Msg = function(e, type, name) {
	let path;
	if (type == "all") {
		for (let [index, val] of list.entries()) {
			name = e.msg.replace(new RegExp(reglist[index], "g"), "");
			if(val.includes('juese_tujian')) continue;
			let new_name = info_img(e, gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`,
				val), name)
			if (new_name) {
				name = new_name
				type = val;
				break;
			}
		}
	}
	path = `${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/${type}/${name}.png`
	if (!fs.existsSync(path)) {
		return false;
	}
	e.reply(segment.image(`file:///${path}`));
	return true;
}
export async function Atlas_list(e) {
	let list = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`,'Atlas_list')
	let name = e.msg.replace(/#|井/g, "")
	for (let i in list) {
		let title = i.split("|");
		for (let j = 0; j < title.length; j++) {
			if (title[j] == name) {
				await utils.replyMake(e, [`当前选择【${name}】`,"请选择:\n" + list[i].join("\n")], 0)
				return true;
			}
		}
	}
	return false;
}
const info_img = function(e, list, name) {
	for (let i in list) {
		for (let val of list[i]) {
			if (val == name || i == name) {
				return i;
			}
		}
	}
}
