import {
	segment
} from "oicq";
import fetch from "node-fetch";
import Common from "../components/Common.js";
import fs from "fs";
import {
	isV3
} from '../components/Changelog.js'
import MysInfo from '../model/mys/mysInfo.js'
// import { MysUser } from "../../../lib/components/Models.js";
// import common from "../../../lib/common.js";
import lodash from "lodash";
import {
	getPluginRender
} from "./render.js";

import gsCfg from '../model/gsCfg.js'
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment';
import MysApi from "../model/mys/mysApi.js";
const _path = process.cwd();
let role_user = Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/dailyNote/json/`, "dispatch_time");

let path_url = ["dailyNote", "xiaoyao_Note"];
let path_img = ["background_image", "/icon/bg"];
let tempDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/NoteTemp`
let tempData = {};
init()

function init() {
	Data.createDir("", tempDataUrl, false);
	tempData = Data.readJSON(tempDataUrl, "tempData")
	// console.log(tempData)
}
//#体力
export async function Note(e, {
	render
}, poke) {
	if (!Cfg.get("sys.Note") && !poke) {
		return false;
	}
	let cookie, uid, res;
	if (isV3) {
		res = await MysInfo.get(e, 'dailyNote')
		if (!res || res.retcode !== 0) return true
		uid = e.uid;
	} else {
		if (NoteCookie[e.user_id]) {
			cookie = NoteCookie[e.user_id].cookie;
			uid = NoteCookie[e.user_id].uid;
		} else if (BotConfig.dailyNote && BotConfig.dailyNote[e.user_id]) {
			cookie = BotConfig.dailyNote[e.user_id].cookie;
			uid = BotConfig.dailyNote[e.user_id].uid;
		} else {
			e.reply(`尚未配置，无法查询体力\n配置教程：${BotConfig.cookieDoc}`);
			return true;
		}
		const response = await getDailyNote(uid, cookie);
		if (!response.ok) {
			e.reply("米游社接口错误");
			return true;
		}
		res = await response.json();
		if (res.retcode == 10102) {
			if (!e.openDailyNote) {
				e.openDailyNote = true;
				await openDailyNote(cookie); //自动开启
				dailyNote(e);
			} else {
				e.reply("请先开启实时便笺数据展示");
			}
			return true;
		}
		if (res.retcode != 0) {
			if (res.message == "Please login") {
				Bot.logger.mark(`体力cookie已失效`);
				e.reply(`体力cookie已失效，请重新配置\n注意：退出米游社登录cookie将会失效！`);
				if (NoteCookie[e.user_id]) {
					// await MysUser.delNote(NoteCookie[e.user_id]);
					delete NoteCookie[e.user_id];
					saveJson();
				}
			} else {
				e.reply(`体力查询错误：${res.message}`);
				Bot.logger.mark(`体力查询错误:${JSON.stringify(res)}`);
			}

			return true;
		}

		//redis保存uid
		redis.set(`genshin:uid:${e.user_id}`, uid, {
			EX: 2592000
		});

		//更新
		if (NoteCookie[e.user_id]) {
			NoteCookie[e.user_id].maxTime = new Date().getTime() + res.data.resin_recovery_time * 1000;
			saveJson();
		}
	}

	let data = res.data;
	//推送任务
	if (e.isTask && data.current_resin < e.sendResin) {
		return;
	}

	if (e.isTask) {
		Bot.logger.mark(`体力推送:${e.user_id}`);
	}

	let nowDay = moment(new Date()).format("DD");
	let resinMaxTime;
	let resinMaxTime_mb2;
	let resinMaxTime_mb2Day;
	if (data.resin_recovery_time > 0) {
		resinMaxTime = new Date().getTime() + data.resin_recovery_time * 1000;
		let maxDate = new Date(resinMaxTime);
		resinMaxTime = moment(maxDate).format("HH:mm");
		let Time_day = await dateTime_(maxDate)
		resinMaxTime_mb2 = Time_day + moment(maxDate).format("hh:mm");
		// console.log(format("dd", maxDate))
		if (moment(maxDate).format("DD") != nowDay) {
			resinMaxTime_mb2Day = `明天`;
			resinMaxTime = `明天 ${resinMaxTime}`;
		} else {
			resinMaxTime_mb2Day = `今天`;
			resinMaxTime = ` ${resinMaxTime}`;
		}
	}
	// console.log(data.expeditions)
	for (let val of data.expeditions) {
		if (val.remained_time <= 0) {
			val.percentage = 0;
		}
		if (val.remained_time > 0) {
			// console.log(val.remained_time)
			val.dq_time = val.remained_time;
			val.remained_time = new Date().getTime() + val.remained_time * 1000;
			// console.log(val.remained_time)
			var urls_avatar_side = val.avatar_side_icon.split("_");
			let id = gsCfg.roleIdToName(urls_avatar_side[urls_avatar_side.length - 1].replace(
				/(.png|.jpg)/g, ""));
			let name = gsCfg.roleIdToName(id, true);
			var time_cha = 20;
			if (role_user["12"].includes(name)) {
				time_cha = 15;
			}
			val.percentage = ((val.dq_time / 60 / 60 * 1 / time_cha) * 100 / 10).toFixed(0) * 10;
			let remainedDate = new Date(val.remained_time);
			val.remained_time = moment(remainedDate).format("HH:mm");
			let Time_day = await dateTime_(remainedDate)
			if (moment(remainedDate).format("DD") != nowDay) {
				val.remained_mb2 = "明天" + Time_day + moment(remainedDate).format("hh:mm");
				val.remained_time = `明天 ${val.remained_time}`;
			} else {
				val.remained_mb2 = "今天" + Time_day + moment(remainedDate).format("hh:mm");
				val.remained_time = ` ${val.remained_time}`;
			}
			val.mb2_icon = val.avatar_side_icon
		}
	}


	let remained_time = "";
	if (data.expeditions && data.expeditions.length >= 1) {
		remained_time = lodash.map(data.expeditions, "remained_time");
		remained_time = lodash.min(remained_time);
		if (remained_time > 0) {
			remained_time = new Date().getTime() + remained_time * 1000;
			let remainedDate = new Date(remained_time);
			remained_time = moment(remainedDate).format("hh:mm");
			if (moment(remainedDate).format("DD") != nowDay) {
				remained_time = `明天 ${remained_time}`;
			} else {
				remained_time = ` ${remained_time}`;
			}
		}
	}

	let coinTime_mb2 = "";
	let coinTime_mb2Day = "";
	let coinTime = "";
	var chnNumChar = ["零", "明", "后", "三", "四", "五", "六", "七", "八", "九"];
	if (data.home_coin_recovery_time > 0) {
		let coinDate = new Date(new Date().getTime() + data.home_coin_recovery_time * 1000);
		let coinDay = Math.floor(data.home_coin_recovery_time / 3600 / 24);
		let coinHour = Math.floor((data.home_coin_recovery_time / 3600) % 24);
		let coinMin = Math.floor((data.home_coin_recovery_time / 60) % 60);
		if (coinDay > 0) {
			coinTime = `${coinDay}天${coinHour}小时${coinMin}分钟`;
			coinTime_mb2Day = chnNumChar[coinDay * 1] + "天";
			let Time_day = await dateTime_(coinDate)
			coinTime_mb2 = Time_day + moment(coinDate).format("hh:mm");
		} else {
			coinTime_mb2 = moment(coinDate).format("hh:mm");
			if (moment(coinDate).format("DD") != nowDay) {
				coinTime_mb2Day = "明天";
				coinTime = `明天 ${ moment(coinDate).format("hh:mm")}`;
			} else {
				coinTime_mb2Day = "今天";
				coinTime = moment(coinDate).format("hh:mm", coinDate);
			}
		}
	}

	let day = moment(new Date()).format("MM-DD HH:mm");
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	day += " " + week[new Date().getDay()];
	let day_mb2 = moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + week[new Date().getDay()];
	//参量质变仪
	if (data?.transformer?.obtained) {
		data.transformer.reached = data.transformer.recovery_time.reached;
		let recovery_time = "";
		if (data.transformer.recovery_time.Day > 0) {
			recovery_time += `${data.transformer.recovery_time.Day}天`;
		}
		if (data.transformer.recovery_time.Hour > 0) {
			recovery_time += `${data.transformer.recovery_time.Hour}小时`;
		}
		if (data.transformer.recovery_time.Minute > 0) {
			recovery_time += `${data.transformer.recovery_time.Minute}分钟`;
		}
		data.transformer.recovery_time = recovery_time;
	}
	let mb = Cfg.get("mb.len", 0) - 1;
	if (mb < 0) {
		mb = lodash.random(0, path_url.length - 1);
	}

	let urlType = note_file("xiaoyao");
	if (urlType.length > 0) {
		urlType = urlType[lodash.random(0, urlType.length - 1)]
	}
	let img_path = `./plugins/xiaoyao-cvs-plugin/resources/dailyNote/${path_img[mb]}`;
	if (tempData[e.user_id] && tempData[e.user_id].type > -1) {
		mb = tempData[e.user_id].type;
		urlType = tempData[e.user_id].temp;
	}
	if (mb == 1) {
		for (var i = 0; i < 5 - data.expeditions.length; i++) {
			data.expeditions.push({
				remained_time: 0,
				remained_mb2: 0,
				percentage: 0,
				mb2_icon: ""
			})
		}
		img_path = `./plugins/xiaoyao-cvs-plugin/resources/dailyNote/Template/${urlType}${path_img[mb]}`;
	}
	var image = fs.readdirSync(img_path);
	var list_img = [];
	for (let val of image) {
		list_img.push(val)
	}
	var imgs = list_img.length == 1 ? list_img[0] : list_img[lodash.random(0, list_img.length - 1)];
	if (mb == 0 && urlType.includes(".")) {
		imgs = urlType
	}
	return await Common.render(`dailyNote/${path_url[mb]}`, {
		save_id: uid,
		uid: uid,
		coinTime_mb2Day,
		coinTime_mb2,
		urlType,
		resinMaxTime_mb2Day,
		resinMaxTime,
		resinMaxTime_mb2,
		remained_time,
		coinTime,
		imgs,
		day_mb2,
		day,
		...data,
	}, {
		e,
		render,
		scale: 1.2
	})
	return true;
}

async function dateTime_(time) {
	return moment(time).format("HH") < 6 ? "凌晨" : moment(time).format("HH") < 12 ? "上午" : moment(time).format(
			"HH") < 17.5 ? "下午" : moment(time).format("HH") < 19.5 ? "傍晚" : moment(time).format("HH") < 22 ? "晚上" :
		"深夜";
}
async function getDailyNote(uid, cookie) {
	let mysApi = new MysApi(uid, cookie)
	let {
		url,
		headers,
		query,
		body
	} = mysApi.getUrl("dailyNote", uid);
	headers.Cookie = cookie;
	const response = await fetch(url, {
		method: "get",
		headers
	});
	return response;
}
export async function saveJson() {
	let path = "data/NoteCookie/NoteCookie.json";
	fs.writeFileSync(path, JSON.stringify(NoteCookie, "", "\t"));
}


//体力定时推送
export async function DailyNoteTask() {
	//体力大于多少时推送
	let sendResin = 120;
	//推送cd，12小时一次
	let sendCD = 12 * 3600;
	//获取需要推送的用户
	for (let [user_id, cookie] of Object.entries(NoteCookie)) {
		user_id = cookie.qq || user_id;
		//没有开启推送
		if (!cookie.isPush) {
			continue;
		}

		//今天已经提醒
		let sendkey = `genshin:dailyNote:send:${user_id}`;
		let send = await redis.get(sendkey);
		if (send) {
			continue;
		}

		let e = {
			sendResin,
			user_id,
			isTask: true
		};

		e.reply = (msg) => {
			Bot.pickUser(user_id * 1).sendMsg(msg).catch((err) => {
				logger.mark(err)
			})
			// common.relpyPrivate(user_id, msg);
		};
		//判断今天是否推送
		if (cookie.maxTime && cookie.maxTime > 0 && new Date().getTime() > cookie.maxTime - (160 - sendResin) * 8 *
			60 * 1000) {
			Bot.logger.mark(`体力推送:${user_id}`);
			redis.set(sendkey, "1", {
				EX: sendCD
			});
			await Note(e, getPluginRender("xiaoyao-cvs-plugin"));
		}
	}
}

export async function pokeNote(e) {
	if (!Cfg.get("note.poke")) {
		return false;
	}
	return await Note(e, getPluginRender("xiaoyao-cvs-plugin"), "poke");
}


export async function Note_appoint(e) {
	let mbPath = `${_path}/plugins/xiaoyao-cvs-plugin/resources/dailyNote/`;
	let msg = e.msg.replace(/#|井|体力|模板|设置/g, "");

	let All = ["默认", "随机", "0"];
	let urlType = note_file();
	if (!isNaN(msg) && msg != 0) {
		if (msg > urlType.length) {
			e.reply(`没有${msg}的索引序号哦~`)
			return true;
		}
		msg = urlType[msg - 1];
	}
	let type = 0;
	let nickname = Bot.nickname;
	if (e.isGroup) {
		let info = await Bot.getGroupMemberInfo(e.group_id, Bot.uin)
		nickname = info.card || info.nickname
	}
	if (msg.includes("列表")) {
		let xlmsg=msg.replace("列表","") || 1
		let mstList = [];
		let sumCount=(urlType.length/80).toFixed(0);
		xlmsg=sumCount-xlmsg>-1?xlmsg:sumCount;
		urlType.unshift(`模板列表共，第${xlmsg}页，共${urlType.length}张，请选择序号~~\n当前支持选择的模板有:`)
		let xxmsg=(xlmsg-1)==0?0:80*(xlmsg-1)
		for (let [index, item] of urlType.entries()) {
			let msg_pass = [];
			let imgurl;
			if (index != 0) {
				if (item.includes(".")) {
					imgurl = await segment.image(`file:///${mbPath}background_image/${item}`);
					item = item.split(".")[0];
				} else {
					imgurl = await segment.image(
						`file:///${mbPath}Template/${item}/icon/bg/${fs.readdirSync(`${mbPath}/Template/${item}/icon/bg/`)[0]}`
					)
				}
				item = index + "." + item
			}
			if(Object.keys(mstList).length==80){
				break;
			}
			if(index<xxmsg&&index!=0){
				continue;
			}
			msg_pass.push(item)
			if (imgurl) {
				msg_pass.push(imgurl)
			}
			mstList.push({
				message: msg_pass,
				nickname: nickname,
				user_id: Bot.uin
			})
		}
		if(xxmsg<urlType.length-1){
			mstList.push({
				message: `更多内容请翻页查看\n如：#体力模板列表2`,
				nickname: nickname,
				user_id: Bot.uin
			})
		}
		e.reply(await Bot.makeForwardMsg(mstList));
		return true;
	}
	if(urlType.includes(msg+".png")){
		msg=msg+".png";
	}
	if (!urlType.includes(msg) && !All.includes(msg)) {
		e.reply("没有找到你想要的模板昵！可输入 【#体力模板列表】 查询当前支持的模板哦~~")
		return true;
	} else if (All.includes(msg)) {
		type = -1;
	} else {
		type = 1
		if (msg.includes(".")) {
			type = 0
		}
	}
	tempData[e.user_id] = {
		temp: msg,
		type: type,
	}
	fs.writeFileSync(tempDataUrl + "/tempData.json", JSON.stringify(tempData));
	init()
	e.reply("诶~这是你选的模板吗，模板设置成功了快用指令来试试吧~！")
	return true;
}

const note_file = function(xiaoyao) {
	var urlFile = fs.readdirSync(`./plugins/xiaoyao-cvs-plugin/resources/dailyNote/Template/`);
	var urlType = [];
	for (let val of urlFile) {
		if (val.includes(".")) continue;
		urlType.push(val)
	}
	if(!xiaoyao){
		var urlFileOne = fs.readdirSync(`./plugins/xiaoyao-cvs-plugin/resources/dailyNote/background_image/`);
		for (let val of urlFileOne) {
			if (!val.includes(".")) continue;
			urlType.push(val)
		
		}
	}
	return urlType;
}
