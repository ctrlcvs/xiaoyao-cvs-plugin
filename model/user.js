import YAML from 'yaml'
import chokidar from 'chokidar'
import MihoYoApi from "../model/mys/mihoyo-api.js"
import fs from 'node:fs'
import promiseRetry from 'promise-retry';
import lodash from 'lodash'
import utils from '../model/mys/utils.js';
import gsCfg from './gsCfg.js';
import {
	isV3
} from '../components/Changelog.js';
const _path = process.cwd();
const plugin = "xiaoyao-cvs-plugin"
const RETRY_OPTIONS = {
	retries: 3,
	minTimeout: 5000,
	maxTimeout: 10000
};
const nameData = ["原神", "崩坏3", "崩坏2", "未定事件簿"];
/** 配置文件 */
export default class user {
	constructor(e) {
		this.e = e;
		this.stokenPath = `./plugins/${plugin}/data/yaml/`
		this.yunPath = `./plugins/${plugin}/data/yunToken/`;
		this.getyunToken(this.e)
	}
	async getCkData() {
		let sumData = {};
		await this.cookie(this.e)
		this.miHoYoApi = new MihoYoApi(this.e);
		if (this.e.yuntoken) {
			let yunres = await this.miHoYoApi.logyunGenshen();
			let yundata = yunres.data
			if (yunres.retcode === 0) {
				sumData["云原神"] = {
					"今日可获取": yundata?.coin?.coin_num,
					"免费时长": yundata?.free_time?.free_time,
					"总时长": yundata.total_time
				}
			}
		}
		if (this.e.cookies) {
			let mysres = await this.miHoYoApi.getTasksList();
			if (mysres.retcode === 0) {
				sumData["米游社"] = {
					"米游币任务": mysres.data.can_get_points != 0 ? "未完成" : "已完成",
					"米游币余额": mysres.data.total_points,
					"今日剩余可获取": mysres.data.can_get_points
				}
			}

		}
		if (this.e.cookie) {
			for (let name of nameData) {
				let resSign = await this.miHoYoApi.honkai3rdSignTask(name);
				if (resSign?.upData) {
					// console.log(resSign?.upData)
					for (let item of resSign?.upData) {
						let num = lodash.random(0, 9999);
						item.upName = item.upName == "原神" ? "ys" : item.upName == "崩坏3" ? "bh3" : item.upName ==
							"崩坏2" ? "bh2" : item.upName == "未定事件簿" ? "wdy" : ""
						sumData[item.upName + "" + num] = {
							"uid": item.game_uid,
							"游戏昵称": item.nickname,
							"等级": item.level,
							"今日签到": item.is_sign ? "已签到" : "未签到",
							"累计签到": item.total_sign_day + "天",
							"今天奖励": item.awards
						}
					}
				}
			}
		}
		return sumData;
	}
	getCookieMap(cookie) {
		let cookiePattern = /^(\S+)=(\S+)$/;
		let cookieArray = cookie.replace(/\s*/g, "").split(";");
		let cookieMap = new Map();
		for (let item of cookieArray) {
			let entry = item.split("=");
			if (!entry[0]) continue;
			cookieMap.set(entry[0], entry[1]);
		}
		return cookieMap;
	}
	getyunToken(e) {
		let file = `${this.yunPath}${e.user_id}.yaml`
		try {
			let ck = fs.readFileSync(file, 'utf-8')
			ck = YAML.parse(ck)
			this.e.devId = ck.devId;
			this.e.yuntoken = ck.yuntoken;
			return ck
		} catch (error) {
			return ""
		}
	}
	async cookie(e) {
		let {
			cookie,
			uid,
			skuid
		} = await this.getCookie(e);
		let cookiesDoc = await this.getcookiesDoc();
		let miHoYoApi = new MihoYoApi(this.e);
		if (!cookie) {
			e.reply("请先#绑定cookie\n发送【体力帮助】查看配置教程")
			return false;
		}
		let stokens = miHoYoApi.getStoken(e.user_id)
		if (!stokens) {
			return true;
		}
		if (!cookie.includes("login_ticket") && (isV3 && !skuid?.login_ticket)) {
			// e.reply("米游社登录cookie不完整，请前往米游社通行证处重新获取cookie~\ncookies必须包含login_ticket【教程】 " + cookiesDoc)
			return false;
		}
		let flot = (await miHoYoApi.stoken(cookie, e));
		// console.log(flot)
		await utils.sleepAsync(1000); //延迟加载防止文件未生成
		if (!flot) {
			e.reply("登录失效请重新登录获取cookie发送机器人~")
			return false;
		}
		return true;
	}
	async getcookiesDoc() {
		return await gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config").cookiesDoc
	}
	async getCookie(e) {
		let skuid, cookie, uid
		if (isV3) {
			skuid = await gsCfg.getBingCookie(e.user_id);
			cookie = skuid.ck;
			uid = skuid.item;
		} else {
			if (NoteCookie[e.user_id]) {
				cookie = NoteCookie[e.user_id].cookie;
				uid = NoteCookie[e.user_id].uid;
				skuid = NoteCookie[e.user_id];
			} else if (BotConfig.dailyNote && BotConfig.dailyNote[e.user_id]) {
				cookie = BotConfig.dailyNote[e.user_id].cookie;
				uid = BotConfig.dailyNote[e.user_id].uid;
				skuid = BotConfig.NoteCookie[e.user_id];
			}
		}
		this.e.uid = uid;
		this.e.cookie = cookie;
		return {
			cookie,
			uid,
			skuid
		}
	}
}
