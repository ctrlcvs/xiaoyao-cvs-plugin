import {
	segment
} from "oicq";
import fs from "fs";

import path from 'path';
const _path = process.cwd();
const __dirname = path.resolve();

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
	let path = `${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/${type}/${name}.png`
	if (!fs.existsSync(path)) {
		// 异步读取上级目录下的所有文件
		fs.readdir(`${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/${type}`, function(err, files) {
			if (err) {
				e.reply("出问题了呢建议检查/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/" + type + "有没有")
				return true
			} else {
				let new_files = [];
				for (let i = 0; i < files.length; i++) {
					for (var j = 0; j < name.length; j++) {
						if (files[i].indexOf(name[j]) >= 0) {
							new_files.push(files[i])
							break;
						}
					}
				}
				if (new_files.length == 0) {
					e.reply("刻晴没有找到你想要的" + name+ "哦")
					return true;
				}
				e.reply("没有找到指定文件呢，您要找的是否是这些：\n"+new_files.join(",").replace(/,/g, ',\n').replace(/(.amr|.mp3|.mp4|.jpg|.png)/g,""))
				return true;
			}
		});
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
	if (!/(#*(.*)(信息|图鉴|突破)|#(.*))$/.test(msg)) return;

	let name = weapon.get(msg.replace(/#|＃|信息|图鉴|突破/g, ""));

	if (name) {
		send_Msg(e, "wuqi_tujian", name)
		return true;
	}

	return false;
}

export async function foodInfo(e) {

	let msg = e.msg || '';

	if (e.atBot) {
		msg = "#" + msg.replace("#", "");
	}
	if (!/(#*食物(.*)|#(.*))$/.test(msg)) return;
	let name = msg.replace(/#|＃|信息|图鉴|食物/g, "");
	if (name) {
		send_Msg(e, "shiwu_tujian", name)
		return true;
	}
	return false;
}

export async function RelicsInfo(e) {
	let msg = e.msg || '';
	if (e.atBot) {
		msg = "#" + msg.replace("#", "");
	}
	if (!/(#*圣遗物(.*)|#(.*))$/.test(msg)) return;
	let name = msg.replace(/#|＃|信息|副本|本|圣遗物/g, "");
	if (name) {
		send_Msg(e, "shengyiwu_tujian", name)
		return true;
	}
	return false;
}


export async function monsterInfo(e) {
	let msg = e.msg || '';
	if (e.atBot) {
		msg = "#" + msg.replace("#", "");
	}
	if (!/(#*(原魔|怪物)(.*)|#(.*))$/.test(msg)) return;
	let name = msg.replace(/#|＃|信息|副本|本|图鉴|数据|原魔/g, "");
	console.log(name)
	if (name) {
		send_Msg(e, "yuanmo_tujian", name)
		return true;
	}
	return false;
}
