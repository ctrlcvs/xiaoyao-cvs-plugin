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
import {
	Cfg
} from "../components/index.js";
// import MysApi from "../components/MysApi.js"

import {
	getUrl,
	getHeaders
} from "../../../lib/app/mysApi.js";

const _path = process.cwd();

//#体力
export async function Note(e, {
	render
}) {
	if(!Cfg.get("sys.Note")){
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
	if (data.resin_recovery_time > 0) {
		resinMaxTime = new Date().getTime() + data.resin_recovery_time * 1000;
		let maxDate = new Date(resinMaxTime);
		resinMaxTime = format("hh:mm", maxDate);

		if (format("dd", maxDate) != nowDay) {
			resinMaxTime = `明天 ${resinMaxTime}`;
		} else {
			resinMaxTime = ` ${resinMaxTime}`;
		}
	}

	let remained_time = "";
	if (data.expeditions && data.expeditions.length >= 1) {
		remained_time = lodash.map(data.expeditions, "remained_time");
		remained_time = lodash.min(remained_time);
		if (remained_time > 0) {
			for (let val of data.expeditions) {
				val.remained_time = new Date().getTime() + val.remained_time * 1000;
				let remainedDate = new Date(val.remained_time);
				val.remained_time = format("hh:mm", remainedDate);
				if (format("dd", remainedDate) != nowDay) {
					val.remained_time = `明天 ${val.remained_time}`;
				} else {
					val.remained_time = ` ${val.remained_time}`;
				}
			}
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

	let coinTime = "";
	if (data.home_coin_recovery_time > 0) {
		let coinDay = Math.floor(data.home_coin_recovery_time / 3600 / 24);
		let coinHour = Math.floor((data.home_coin_recovery_time / 3600) % 24);
		let coinMin = Math.floor((data.home_coin_recovery_time / 60) % 60);
		if (coinDay > 0) {
			coinTime = `${coinDay}天${coinHour}小时${coinMin}分钟`;
		} else {
			let coinDate = new Date(new Date().getTime() + data.home_coin_recovery_time * 1000);
			if (format("dd", coinDate) != nowDay) {
				coinTime = `明天 ${format("hh:mm", coinDate)}`;
			} else {
				coinTime = format("hh:mm", coinDate);
			}
		}
	}

	let day = format("MM-dd hh:mm", new Date());
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	day += " " + week[new Date().getDay()];
	
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
	var image= fs.readdirSync(`./plugins/xiaoyao-cvs-plugin/resources/dailyNote/background_image`);
	var list_img=[];
	for (let val of image) {
		list_img.push(val)
	}
	var imgs=list_img[lodash.random(0, list_img.length-1)];
	return await Common.render("dailyNote/dailyNote", {
		save_id: uid,
		uid: uid,
		resinMaxTime,
		remained_time,
		coinTime,
		imgs,
		day,
		...data,
	}, {
		e,
		render,
		scale: 1.2
	})
	return true;
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
