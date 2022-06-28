import {
	segment
} from "oicq";
import fetch from "node-fetch";
import Common from "../components/Common.js";
import fs from "fs";
import format from "date-format";
import puppeteer from "puppeteer";
import common from "../../../lib/common.js";
import lodash from "lodash";
import Data from "../components/Data.js"
import {
	Cfg
} from "../components/index.js";
import moment from 'moment';
// import MysApi from "../components/MysApi.js"

import {
	getUrl,
	getHeaders
} from "../../../lib/app/mysApi.js";

const _path = process.cwd();
let role_user = Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/dailyNote/json/`, "dispatch_time");

let path_url = ["dailyNote", "xiaoyao_Note"];
let path_img = ["background_image", "/icon/bg"];

//#体力
export async function Note(e, {
	render
}) {
	if (!Cfg.get("sys.Note")) {
		return false;
	}
	let cookie, uid;
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
	const res = await response.json();

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
				await MysUser.delNote(NoteCookie[e.user_id]);
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

	let data = res.data;
	//推送任务
	if (e.isTask && data.current_resin < e.sendResin) {
		return;
	}

	if (e.isTask) {
		Bot.logger.mark(`体力推送:${e.user_id}`);
	}

	let nowDay = format("dd", new Date());
	let resinMaxTime;
	let resinMaxTime_mb2;
	let resinMaxTime_mb2Day;
	if (data.resin_recovery_time > 0) {
		resinMaxTime = new Date().getTime() + data.resin_recovery_time * 1000;
		let maxDate = new Date(resinMaxTime);
		resinMaxTime = format("hh:mm", maxDate);
		let Time_day = await dateTime_(maxDate)
		resinMaxTime_mb2 = Time_day + moment(maxDate).format("hh:mm");
		// console.log(format("dd", maxDate))
		if (format("dd", maxDate) != nowDay) {
			resinMaxTime_mb2Day = `明天`;
			resinMaxTime = `明天 ${resinMaxTime}`;
		} else {
			resinMaxTime_mb2Day = `今天`;
			resinMaxTime = ` ${resinMaxTime}`;
		}
	}
	// console.log(data.expeditions)
	for (let val of data.expeditions) {
		if (val.remained_time > 0) {
			// console.log(val.remained_time)
			val.dq_time = val.remained_time;
			val.remained_time = new Date().getTime() + val.remained_time * 1000;
			// console.log(val.remained_time)
			var urls_avatar_side = val.avatar_side_icon.split("_");
			let id = YunzaiApps.mysInfo.roleIdToName(urls_avatar_side[urls_avatar_side.length - 1].replace(
				/(.png|.jpg)/g, ""));
			let name = YunzaiApps.mysInfo.roleIdToName(id, true);
			var time_cha = 20;
			if (role_user["12"].includes(name)) {
				time_cha = 12;
			}
			val.percentage = ((val.dq_time / 60 / 60 * 1 / time_cha) * 100 / 10).toFixed(0) * 10;
			if(val.dq_time==0) val.percentage=100;
			let remainedDate = new Date(val.remained_time);
			val.remained_time = format("hh:mm", remainedDate);
			let Time_day = await dateTime_(remainedDate)
			if (format("dd", remainedDate) != nowDay) {
				val.remained_mb2 = "明天"+Time_day + moment(remainedDate).format("hh:mm" );
				val.remained_time = `明天 ${val.remained_time}`;
			} else {
				val.remained_mb2 = "今天"+Time_day + moment(remainedDate).format("hh:mm" );
				val.remained_time = ` ${val.remained_time}`;
			}
		}
	}
	let remained_time = "";
	if (data.expeditions && data.expeditions.length >= 1) {
		remained_time = lodash.map(data.expeditions, "remained_time");
		remained_time = lodash.min(remained_time);
		if (remained_time > 0) {
			remained_time = new Date().getTime() + remained_time * 1000;
			let remainedDate = new Date(remained_time);
			remained_time = format("hh:mm", remainedDate);
			if (format("dd", remainedDate) != nowDay) {
				remained_time = `明天 ${remained_time}`;
			} else {
				remained_time = ` ${remained_time}`;
			}
		}
	}

	let coinTime_mb2 = "";
	let coinTime_mb2Day = "";
	let coinTime = "";
	var chnNumChar = ["零", "一", "后", "三", "四", "五", "六", "七", "八", "九"];
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
			if (format("dd", coinDate) != nowDay) {
				coinTime_mb2Day = "明天";
				coinTime = `明天 ${format("hh:mm", coinDate)}`;
			} else {
				coinTime_mb2Day = "今天";
				coinTime = format("hh:mm", coinDate);
			}
		}
	}

	let day = format("MM-dd hh:mm", new Date());
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	day += " " + week[new Date().getDay()];
	let day_mb2 = format("yyyy年MM月dd日 hh:mm", new Date()) + " " + week[new Date().getDay()];
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
	let mb=Cfg.get("mb.len", 0)-1;
	if(mb<0){
		mb=lodash.random(0,path_url.length-1);
	}
	var image = fs.readdirSync(`./plugins/xiaoyao-cvs-plugin/resources/dailyNote/${path_img[mb]}`);
	var list_img = [];
	for (let val of image) {
		list_img.push(val)
	}
	var imgs = list_img.length == 1 ? list_img[0] : list_img[lodash.random(0, list_img.length - 1)];
	return await Common.render(`dailyNote/${path_url[mb]}`, {
		save_id: uid,
		uid: uid,
		coinTime_mb2Day,
		coinTime_mb2,
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
	return format("hh", time) < 6 ? "凌晨" : format("hh", time) < 12 ? "上午" : format("hh",
		time) < 16 ? "下午" : "傍晚";
}

async function getDailyNote(uid, cookie) {
	let {
		url,
		headers,
		query,
		body
	} = getUrl("dailyNote", uid);

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
			common.relpyPrivate(user_id, msg);
		};

		//判断今天是否推送
		if (cookie.maxTime && cookie.maxTime > 0 && new Date().getTime() > cookie.maxTime - (160 - sendResin) * 8 *
			60 * 1000) {
			//Bot.logger.mark(`体力推送:${user_id}`);

			redis.set(sendkey, "1", {
				EX: sendCD
			});

			await Note(e, {
				render
			});
		}
	}
}
