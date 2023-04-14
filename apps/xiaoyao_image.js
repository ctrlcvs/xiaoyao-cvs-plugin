import fs from "fs";
import {
	Cfg
} from "../components/index.js";
import gsCfg from '../model/gsCfg.js'
import {
	isV3
} from '../components/Changelog.js'
import utils from "../model/mys/utils.js";
const _path = process.cwd();

const list = ["wuqi_tujian", "shiwu_tujian", "yuanmo_tujian", "mijin_tujian", "shengyiwu_tujian", "daoju_tujian"]
const reglist = ["(#|专武|武器|图鉴)", "(#|食物|特殊料理|特色|料理|食材|图鉴)", "(#|原魔|怪物|图鉴|信息)", "(#|秘境|信息|图鉴)", "(#|圣遗物|图鉴)",
	"(#|图鉴|道具)"
]
let pathPlus = `${_path}/plugins/xiaoyao-cvs-plugin/resources/xiaoyao-plus/`
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
	if (await getBasicEvent(e)) return true;
	if (await filePath(e)) return true;
	return send_Msg(e, "all", "");
}

async function getBasicEvent(e) {
	if (!/原牌|七圣召唤|七圣|动态|幻影/.test(e.msg)) return false; //为了避免抢夺其他指令
	let msg = e.msg.replace(/#|＃|信息|图鉴|原牌|七圣召唤|七圣|动态|幻影/g, "");
	let name, type;
	let list = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`, 'Basic_Event')
	name = info_img(e, list, msg)
	if(!name){
		list=gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`, 'wuqi_tujian')
		name = info_img(e, list, msg)
	}
	type = `basicInfo_tujian/event`
	send_Msg(e, type, name)
	return true;
}

/** 获取角色卡片的原图 */
export async function getBasicVoide(e) {
	if (!e.hasReply && !e.source) {
		return true
	}
	// 引用的消息不是自己的消息
	if (e.source.user_id !== e.self_id) {
		return true
	}
	// 引用的消息不是纯图片
	if (!/^\[图片]$/.test(e.source.message)) {
		return true
	}
	// 获取原消息
	let source
	if (e.isGroup) {
		source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
	} else {
		source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
	}
	if (source) {
		let imgPath = await redis.get(`xiaoyao:basic:${source.message_id}`)
		if (imgPath) {
			e.reply([segment.video(`file://${imgPath}`)])
			return true
		}
		if (source.time) {
			let time = new Date()
			// 对at错图像的增加嘲讽...
			if (time / 1000 - source.time < 3600) {
				e.reply([segment.image(process.cwd() + '/plugins/miao-plugin/resources/common/face/what.jpg')])
				return true
			}
		}
	}
	e.reply('消息太过久远了，俺也忘了动态是啥了，下次早点来吧~')
	return true
}
export async function roleInfo(e) {
	let msg = e.msg.replace(/#|＃|信息|图鉴|命座|天赋|原牌|七圣召唤|七圣|动态|幻影/g, "");
	let Botcfg, id, type = 'juese_tujian';
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
	}
	if (/原牌|七圣/.test(e.msg)) {
		if (!name) {
			let list = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`, 'yuanmo_tujian')
			name = info_img(e, list, msg)
		}
		type = `basicInfo_tujian/role/${name}`
	}
	if (!name) return false;
	send_Msg(e, type, name)
	return true;
}

const filePath = async function (e) {
	let data = list;
	data.push("juese_tujian")
	for (let [index, val] of data.entries()) {
		let msg = e.msg;
		if (index != data.length - 1) {
			msg = e.msg.replace(new RegExp(reglist[index], "g"), "");
		} else {
			msg = e.msg.replace(/#|＃|信息|图鉴|命座|天赋/g, "");
		}
		let path = `${pathPlus}${val}/${msg}.png`
		if (fs.existsSync(path)) {
			e.reply(segment.image(`file://${path}`));
			return true;
		}
	}
}

const send_Msg = async function (e, type, name) {
	let path;
	if (type == "all") {
		for (let [index, val] of list.entries()) {
			name = e.msg.replace(new RegExp(reglist[index], "g"), "");
			if (val.includes('juese_tujian')) continue;
			let new_name = info_img(e, gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`,
				val), name)
			if (new_name) {
				name = new_name
				type = val;
				break;
			}
		}
	}
	path = `${pathPlus}${type}/${name}.png`
	if (!fs.existsSync(path)) {
		return false;
	}
	let msg = segment.image(`file://${path}`)
	try {
		if (/动态|幻影/.test(e.msg)) msg = segment.video(`file://${path.replace(/\.png|\.jpg/, '.mp4')}`)
	} catch (error) {
		Bot.logger.error(`发送七圣动态数据失败:` + error)
		// error
	}
	let { message_id } = await e.reply(msg);
	await redis.set(`xiaoyao:basic:${message_id}`, path.replace(/\.png|\.jpg/, '.mp4'), 10800); //三小时
	return true;
}
export async function Atlas_list(e) {
	let list = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/resources/Atlas_alias/`, 'Atlas_list')
	let name = e.msg.replace(/#|井/g, "")
	for (let i in list) {
		let title = i.split("|");
		for (let j = 0; j < title.length; j++) {
			if (title[j] == name) {
				await utils.replyMake(e, [`当前选择【${name}】`, "请选择:\n" + list[i].join("\n")], 0)
				return true;
			}
		}
	}
	return false;
}

const info_img = function (e, list, name) {
	for (let i in list) {
		for (let val of list[i]) {
			if (val == name || i == name) {
				return i;
			}
			if(typeof val!="string"){
				for (const item of Object.keys(val)) {
					if(val[item].includes(name)||item==name){
						return item;
					}
				}
			}
		}
	}
}
