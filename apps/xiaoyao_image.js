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
const _path = process.cwd();
const __dirname = path.resolve();

const list = ["wuqi_tujian", "shiwu_tujian", "yuanmo_tujian", "mijin_tujian", "shengyiwu_tujian", "daoju_tujian"]
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
	var name = e.msg.replace(/#|＃|信息|图鉴|圣遗物|食物|食材|特殊|特色|料理/g, "");
	return send_Msg(e, "all", name);
}


export async function roleInfo(e) {
	// let msg=e.msg.replace(/#|图鉴/g,"");
	let msg = e.msg.replace(/#|＃|信息|图鉴|命座|天赋|突破/g, "");
	let Botcfg;
	let id;
	if (isV3) {
		Botcfg = (await import(`file://${_path}/plugins/genshin/model/gsCfg.js`)).default;
		Botcfg.roleNameToID(msg)
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

const send_Msg = function(e, type, name) {
	let path;
	if (type == "all") {
		for (let val of list) {
			path = `${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/${val}/${name}.png`
			if (fs.existsSync(path)) {
				e.reply(segment.image(`file:///${path}`));
				return true;
			}
			let new_name = info_img(e, Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`,
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
	let list = Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`, "Atlas_list");
	let name = e.msg.replace(/#|井/g, "")
	for (let i in list) {
		var title = i.split("|");
		for (let j = 0; j < title.length; j++) {
			if (title[j] == name) {
				await e.reply("请选择:\n" + list[i].join("\n"))
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
