import {
	segment
} from "oicq";
import fs from "fs";
import Data from "../components/Data.js"
import path from 'path';
import fetch from "node-fetch";
const _path = process.cwd();
const __dirname = path.resolve();

const list = ["shiwu_tujian", "yuanmo_tujian"]
export async function AtlasAlias(e) {
	if (await roleInfo(e)) return true;
	if (await weaponInfo(e)) return true;
	// if (await foodInfo(e)) return true;
	if (await RelicsInfo(e)) return true;
	// if (await monsterInfo(e)) return true;
	var name = e.msg.replace(/#|＃|信息|图鉴|命座|天赋|突破|圣遗物|原魔|食物|食材|的|特殊|材|料|特色|料理|理|色/g, "");
	send_Msg(e, "all", name)
	return true;
}


export async function roleInfo(e) {
	// let msg=e.msg.replace(/#|图鉴/g,"");
	let msg = e.msg.replace(/#|＃|信息|图鉴|命座|天赋|突破/g, "");
	let id = YunzaiApps.mysInfo.roleIdToName(msg);
	let name;
	if (["10000005", "10000007", "20000000"].includes(id)) {
		if (!["风主", "岩主", "雷主"].includes(msg)) {
			e.reply("请选择：风主图鉴、岩主图鉴、雷主图鉴");
			return true;
		}
		name = msg;
	} else {
		name = YunzaiApps.mysInfo.roleIdToName(id, true);
		if (!name) return false;
	}
	send_Msg(e, "juese_tujian", name)
	return true;
}

const send_Msg = function(e, type, name) {
	if (type == "all") {
		for (let val of list) {
			let new_name = info_img(e, Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`,
				val), name)
			if (new_name) {
				name = new_name
				type = val;
				break;
			}
		}
	}
	let path = `${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/${type}/${name}.png`
	if (!fs.existsSync(path)) {
		return true;
	}
	e.reply(segment.image(`file:///${path}`));
	return true;
}
let weapon = new Map();
let weaponFile = [];
await init();
export async function init(isUpdate = false) {
	let weaponJson = JSON.parse(fs.readFileSync("./config/genshin/weapon.json", "utf8"));
	for (let i in weaponJson) {
		for (let val of weaponJson[i]) {
			weapon.set(val, i);
		}
	}
	weaponFile = fs.readdirSync("./resources/weaponInfo_xiaoyao");
	for (let val of weaponFile) {
		let name = val.replace(".png", "");
		weapon.set(name, name);
	}
}

export async function weaponInfo(e) {

	let msg = e.msg || '';
	if (e.atBot) {
		msg = "#" + msg.replace("#", "");
	}
	if (!/(#*(.*)(信息|图鉴|突破|武器|材料)|#(.*))$/.test(msg)) return;

	let name = weapon.get(msg.replace(/#|＃|信息|图鉴|突破|武器|材料/g, ""));

	if (name) {
		send_Msg(e, "wuqi_tujian", name)
		return true;
	}

	return false;
}

export async function RelicsInfo(e) {
	let msg = e.msg || '';
	if (e.atBot) {
		msg = "#" + msg.replace("#", "");
	}
	// if (!/(#*圣遗物(.*)|#(.*))$/.test(msg)) return;
	let name = msg.replace(/#|＃|信息|副本|本|圣遗物|图鉴/g, "");
	let response = await fetch(`https://info.minigg.cn/artifacts?query=${encodeURIComponent(name)}`);
	let res = await response.json();
	if (res?.errcode == "10006") return false;
	name = res["name"];
	if (name) {
		send_Msg(e, "shengyiwu_tujian", name)
		return true;
	}
	return false;
}
const info_img = function(e, list, name) {
	for (let i in list) {
		for (let val of list[i]) {
			if (val == name) {
				return i;
			}
		}
	}
}
