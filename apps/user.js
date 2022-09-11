import MihoYoApi from "../model/mys/mihoyo-api.js"
import utils from '../model/mys/utils.js';
import promiseRetry from 'promise-retry';
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment';
import lodash from 'lodash';
import Common from "../components/Common.js";
import {
	isV3
} from '../components/Changelog.js';
import gsCfg from '../model/gsCfg.js';
import fs from "fs";
import {
	segment
} from "oicq";
import YAML from 'yaml'
import User from "../model/user.js"

export const rule = {
	userInfo: {
		reg: "^#*(ck|stoken|cookie|cookies|签到)查询$",
		describe: "用户个人信息查询"
	},
	gclog: {
		reg: "^#*更新抽卡记录$",
		describe: "更新抽卡记录"
	},
	mytoken: {
		reg: "^#*我的(stoken|云ck)$",
		describe: "查询绑定数据"
	},
	bindStoken: {
		reg: "^(.*)stoken=(.*)$",
		describe: "绑定stoken"
	},
	delSign: {
		reg: "^#*删除(我的)*(stoken|(云原神|云ck))$",
		describe: "删除云原神、stoken数据"
	},
	updCookie: {
		reg: "^#*(刷新|更新)(ck|cookie)$",
		describe: "刷新cookie"
	}
}
const _path = process.cwd();
const YamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
const yunpath = `${_path}/plugins/xiaoyao-cvs-plugin/data/yunToken/`;
export async function userInfo(e, {
	render
}) {
	let user = new User(e);
	e.reply("正在获取角色信息请稍等...")
	let sumData = await user.getCkData()
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	let day = moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + week[new Date().getDay()];
	if (Object.keys(sumData).length == 0) {
		return true;
	}
	let ck = "";
	if (e.cookie) {
		ck = await utils.getCookieMap(e.cookie);
		ck = ck?.get("ltuid")
	}
	return await Common.render(`user/userInfo`, {
		uid: e.user_id,
		ltuid: ck || e.user_id,
		save_id: e.user_id,
		day,
		sumData
	}, {
		e,
		render,
		scale: 1.2
	})
	return true;
}
let configData = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config");
export async function gclog(e) {
	let user = new User(e);
	await user.cookie(e)
	let redis_Data = await redis.get(`xiaoyao:gclog:${e.user_id}`);
	if (redis_Data) {
		let time = redis_Data * 1 - Math.floor(Date.now() / 1000);
		e.reply(`请求过快,请${time}秒后重试...`);
		return true;
	}
	let miHoYoApi = new MihoYoApi(e);
	if (!e.cookies || e.cookies.includes("undefined")) {
		e.reply(`请先绑定stoken\n发送【stoken帮助】查看配置教程`)
		return true;
	}
	let kkbody = await miHoYoApi.getbody("原神");
	const objData = await miHoYoApi.getUserInfo(kkbody)
	let data = objData.data
	e.region = e.uid[0] * 1 == 5 ? "cn_qd01" : "cn_gf01"
	let authkeyrow = await miHoYoApi.authkey(data);
	if (!authkeyrow?.data) {
		e.reply("authkey获取失败：" + authkeyrow.message)
		return true;
	}
	let authkey = authkeyrow.data["authkey"]
	let postdata = {
		'authkey_ver': '1',
		'sign_type': '2',
		'auth_appid': 'webview_gacha',
		'init_type': '301',
		'gacha_id': 'fecafa7b6560db5f3182222395d88aaa6aaac1bc',
		'timestamp': Math.floor(Date.now() / 1000), //当前时间搓
		'lang': 'zh-cn',
		'device_type': 'mobile',
		'plat_type': 'ios',
		'region': e.region,
		'authkey': encodeURIComponent(authkey),
		'game_biz': 'hk4e_cn',
		'gacha_type': "301",
		'page': 1,
		'size': 5,
		'end_id': 0,
	}
	let url = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog?`
	for (let item of Object.keys(postdata)) {
		url += `${item}=${postdata[item]}&`
	}
	e.msg = url.substring(0, url.length - 1);
	let sendMsg = [];
	e.reply("抽卡记录获取中请稍等...")
	e._reply = e.reply;
	e.reply = (msg) => {
		sendMsg.push(msg)
	}
	if (isV3) {
		let gclog = (await import(`file:///${_path}/plugins/genshin/model/gachaLog.js`)).default
		await (new gclog(e)).logUrl()
	} else {
		let {
			bing
		} = (await import(`file:///${_path}/lib/app/gachaLog.js`))
		e.isPrivate = true;
		await bing(e)
	}
	await utils.replyMake(e, sendMsg, 1)
	let time = (configData.gclogEx || 5) * 60
	redis.set(`xiaoyao:gclog:${e.user_id}`, Math.floor(Date.now() / 1000) + time, { //数据写入缓存避免重复请求
		EX: time
	});
	return true;
}
export async function mytoken(e) {
	if (!e.isPrivate) {
		e.reply("请私聊发送")
		return true;
	}
	let user = new User(e);
	let msg = e.msg.replace(/#|我的/g, "");
	let ck, sendMsg;
	if (msg === "stoken") {
		await user.getCookie(e)
		ck = await user.getStoken(e.user_id)
		sendMsg = `stuid=${ck.stuid};stoken=${ck.stoken};ltoken=${ck.ltoken};`;
	} else {
		ck = await user.getyunToken(e);
		sendMsg = `${ck.yuntoken}devId=${ck.devId}`
	}
	if (sendMsg.includes("undefined")) {
		e.reply(`您暂未绑定${msg}`);
		return true;
	}
	e.reply(sendMsg)
	return true;
}
export async function bindStoken(e) {
	if (!e.isPrivate) {
		e.reply("请私聊发送")
		return true;
	}
	let msg = e.msg;
	let user = new User(e);
	let miHoYoApi = new MihoYoApi(e);
	miHoYoApi.cookies = msg;
	let resObj = await miHoYoApi.getTasksList();
	if (!resObj?.data) {
		await e.reply(`登录Stoken失效\n请发送【stoken帮助】查看配置教程重新配置~`);
		return true;
	}
	await user.getCookie(e)
	let sk = await utils.getCookieMap(msg)
	let data = {}
	data[e.uid] = {
		uid: e.uid,
		userId: e.user_id,
		is_sign: true
	};
	for (var item of sk.entries()) {
		data[e.uid][item[0]] = item[1];
	}
	await gsCfg.saveBingStoken(e.user_id, data)
	msg = 'stoken绑定成功您可通过下列指令进行操作:';
	msg += '\n【#米币查询】查询米游币余额'
	msg += '\n【#mys原神签到】获取米游币'
	msg += '\n【#更新抽卡记录】更新抽卡记录'
	msg += '\n【#刷新ck】刷新失效cookie'
	msg += '\n【#我的stoken】查看绑定信息'
	msg += '\n【#删除stoken】删除绑定信息'
	await e.reply(msg);
	return true;
}

export async function delSign(e) {
	let user = new User(e);
	e.msg = e.msg.replace(/#|删除|我的/g, "");
	let url = e.msg == "stoken" ? `${YamlDataUrl}` : `${yunpath}`;
	await user.delSytk(url, e)
	return true;
}
export async function updCookie(e) {
	let stoken=await gsCfg.getUserStoken(e.user_id);
	if (Object.keys(stoken).length==0) {
		e.reply("请先绑定stoken\n发送【stoken帮助】查看配置教程")
		return true;
	}
	let miHoYoApi = new MihoYoApi(e);
	let sendMsg = [];
	e._reply = e.reply;
	e.reply = (msg) => {
		sendMsg.push(msg)
	}
	for(let item of  Object.keys(stoken)){
		miHoYoApi.cookies= `stuid=${stoken[item].stuid};stoken=${stoken[item].stoken};ltoken=${stoken[item].ltoken};`;
		let resObj = await miHoYoApi.updCookie();
		if (!resObj?.data) {
			e._reply(`请求异常：${resObj.message}`)
			return false;
		}
		let sk = await utils.getCookieMap(miHoYoApi.cookies)
		let ck = resObj["data"]["cookie_token"];
		e.msg = `ltoken=${sk.get("ltoken")};ltuid=${sk.get("stuid")};cookie_token=${ck}; account_id=${sk.get("stuid")};`
		if (isV3) {
			let userck = (await import(`file:///${_path}/plugins/genshin/model/user.js`)).default
			e.ck = e.msg;
			await (new userck(e)).bing()
		} else {
			let {
				bingCookie
			} = (await import(`file:///${_path}/lib/app/dailyNote.js`))
			e.isPrivate = true;
			await bingCookie(e)
		}
	}
	await utils.replyMake(e, sendMsg, 0)
	return true;
}
