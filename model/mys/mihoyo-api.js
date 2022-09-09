import utils from './utils.js';
import md5 from 'md5';
import _ from 'lodash';
import superagent from 'superagent';
import fs from "fs";
import YAML from 'yaml'
import {
	Data
} from "../../components/index.js";
import gsCfg from '../gsCfg.js'
import {
	isV3
} from '../../components/Changelog.js';
import fetch from "node-fetch"

const APP_VERSION = "2.36.1";
const mhyVersion = "2.11.1";
const salt = "n0KjuIrKgLHh08LWSCYP0WXlVXaYvV64";
const salt2 = "t0qEgfub6cvueAPgR5m9aQWWVciEer7v";
const saltWeb = "YVEIkzDFNHLeKXLxzqCA9TzxCpWwbIbk";
const oldsalt = "z8DRIUjNDT7IT5IZXvrUAxyupA1peND9";
const DEVICE_ID = utils.randomString(32).toUpperCase();
const DEVICE_NAME = utils.randomString(_.random(1, 10));
const _path = process.cwd();
let YamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
let web_api = `https://api-takumi.mihoyo.com`
let hk4_api = `https://hk4e-api.mihoyo.com`;
// 米游社的版块
const boards = {
	honkai3rd: {
		forumid: 1,
		key: 'honkai3rd',
		biz: 'bh3_cn',
		actid: 'e202207181446311',
		name: '崩坏3',
		url: "https://bbs.mihoyo.com/bh3/",
		getReferer() {
			return `https://webstatic.mihoyo.com/bh3/event/euthenia/index.html?bbs_presentation_style=fullscreen&bbs_game_role_required=${this.biz}&bbs_auth_required=true&act_id=${this.actid}&utm_source=bbs&utm_medium=mys&utm_campaign=icon`
		}
	},
	genshin: {
		forumid: 26,
		key: 'genshin',
		biz: 'hk4e_cn',
		actid: 'e202009291139501',
		name: '原神',
		url: "https://bbs.mihoyo.com/ys/",
		getReferer() {
			return `https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=${this.actid}&utm_source=bbs&utm_medium=mys&utm_campaign=icon`
		}
	},
	honkai2: {
		forumid: 30,
		biz: 'bh2_cn',
		actid: 'e202203291431091',
		name: '崩坏2',
		url: "https://bbs.mihoyo.com/bh2/",
		getReferer() {
			return `https://webstatic.mihoyo.com/bbs/event/signin/bh2/index.html?bbs_auth_required=true&act_id=${this.actid}&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon`
		}
	},
	tears: {
		forumid: 37,
		biz: 'nxx_cn',
		name: '未定事件簿',
		actid: 'e202202251749321',
		url: "https://bbs.mihoyo.com/wd/",
		getReferer() {
			return `https://webstatic.mihoyo.com/bbs/event/signin/nxx/index.html?bbs_auth_required=true&bbs_presentation_style=fullscreen&act_id=${this.actid}`
		}
	},
	/** 以下数据待定 由于并未有存在签到入口可能后续会开放*/
	house: {
		forumid: 34,
		name: '大别野',
		url: "https://bbs.mihoyo.com/dby/"
	},
	honkaisr: {
		forumid: 52,
		name: '崩坏星穹铁道',
		url: "https://bbs.mihoyo.com/sr/"
	},
	jql: {
		forumid: 57,
		name: "绝区零",
		url: "https://bbs.mihoyo.com/zzz/"
	}
}

export default class MihoYoApi {
	constructor(e) {
		if (e) {
			this.e = e
			this.cookie = e.cookie
			this.userId = String(e.user_id)
			this.yuntoken = e.yuntoken
			this.devId = e.devId
			// //初始化配置文件
			let data = this.getStoken(this.e.user_id);
			if (data) {
				this.cookies = `stuid=${data.stuid};stoken=${data.stoken};ltoken=${data.ltoken};`;
				this.e.cookies = this.cookies
			}
		}
		Data.createDir("", YamlDataUrl, false);

	}
	getbody(name) {
		for (let item in boards) {
			if (boards[item].name === name) {
				return boards[item]
			}
		}
	}
	async honkai3rdSignTask(name) {
		let kkbody = this.getbody(name);
		try {
			// 获取账号信息
			const objData = await this.getUserInfo(kkbody)
			let data = objData.data
			if (data?.list?.length == 0 || !data?.list) {
				return {
					message: `未绑定${name}信息`
				}
			}
			let message = `\n${name}共计${data.list.length}个账号\n`;
			let upData = [];
			for (let item of data.list) {
				item.upName = name
				let objshuj = await this.isPostSign(kkbody, item.game_uid, item.region)
				item.total_sign_day = objshuj?.data?.total_sign_day
				if (objshuj?.data?.is_sign) {
					item.is_sign = true;
					// console.log(objshuj)
					message += `游戏id：${item.nickname}-${item.game_uid}：今日已签到~\n`;
				} else {
					objshuj = (await this.postSign(kkbody, item.game_uid, item.region))
					if (objshuj?.data?.gt) {
						item.is_sign = false;
						message += `游戏id：${item.nickname}-${item.game_uid}:签到出现验证码~\n请晚点后重试，或者手动上米游社签到`;
					} else {
						item.total_sign_day++;
						item.is_sign = true;
						message +=
							`游戏id：${item.nickname}-${item.game_uid}：${objshuj.message=="OK"?"签到成功":objshuj.message}\n`
					}
				}
				//获取签到信息和奖励信息 
				const SignInfo = await this.getSignInfo(kkbody)
				if (SignInfo) {
					let awards = SignInfo.data.awards[item.total_sign_day - 1];
					item.awards = awards.name + "*" + awards.cnt
				}
				upData.push(item)
				await utils.randomSleepAsync();
			}
			// 签到操作
			return {
				message,
				upData
			}
		} catch (error) {
			Bot.logger.mark(`error.message`, error.message)
		}
	}
	async forumSign(forumId) {
		const url = `https://bbs-api.mihoyo.com/apihub/app/api/signIn`;
		this.forumId = forumId;
		let res = await superagent.post(url).set(this._getHeader()).send(JSON.stringify({
			gids: forumId * 1
		})).timeout(10000);
		let resObj = JSON.parse(res.text);
		// Bot.logger.mark(`ForumSign: ${res.text}`);
		return resObj;
	}
	async getTasksList() {
		let res = await superagent.get(`https://bbs-api.mihoyo.com/apihub/sapi/getUserMissionsState`).set(this
			._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj
	}
	// 获取签到状态和奖励信息
	async getSignInfo(board) {
		let url = `${web_api}/event/luna/home?lang=zh-cn&`
		if (board.name == "原神") {
			url = `${web_api}/event/bbs_sign_reward/home?`
		}
		// if (board.name == "崩坏2" || board.name == "未定事件簿") {
		// 	url = `${web_api}/event/luna/home?lang=zh-cn`
		// }
		let res = await superagent.get(
			`${url}act_id=${board.actid}`
		).set(this
			.getpubHeaders(board)).timeout(10000);
		let resObj = JSON.parse(res.text);
		// logger.mark(`getSignInfo: ${res.text}`);
		return resObj;
	}


	async forumPostList(forumId) {
		const url =
			`https://api-takumi.mihoyo.com/post/api/getForumPostList?forum_id=${forumId}&is_good=false&is_hot=false&page_size=20&sort_type=1`;
		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj;
	}

	async forumPostDetail(postId) {
		const url = `https://api-takumi.mihoyo.com/post/api/getPostFull?post_id=${postId}`;
		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj;
	}

	async forumPostShare(postId) {
		const url =
			`https://api-takumi.mihoyo.com/apihub/api/getShareConf?entity_id=${postId}&entity_type=1`;
		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj;
	}
	async forumPostVote(postId) {
		const url = `https://api-takumi.mihoyo.com/apihub/sapi/upvotePost`;
		const upvotePostData = {
			"post_id": postId,
			"is_cancel": false
		}
		let res = await superagent.post(url).set(this._getHeader()).send(JSON.stringify(upvotePostData));
		let resObj = JSON.parse(res.text);
		return resObj;
	}

	async yunGenshen() {
		let url = `https://api-cloudgame.mihoyo.com/hk4e_cg_cn/gamer/api/login`;
		let res = await superagent.post(url).set(this.getyunHeader()).timeout(10000);
		let sendMSg = "";
		let log_msg = (await this.logyunGenshen()).log_msg
		sendMSg += log_msg
		Bot.logger.info(log_msg)
		url =
			`https://api-cloudgame.mihoyo.com/hk4e_cg_cn/gamer/api/listNotifications?status=NotificationStatusUnread&type=NotificationTypePopup&is_sort=true`;
		res = await superagent.get(url).set(this.getyunHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		let list = resObj.data.list;
		if (Object.keys(list).length == 0) {
			resObj.sendMSg = "您今天的奖励已经领取了啦~";
			return resObj;
		}
		for (let item of list) {
			let reward_id = item.id;
			let reward_msg = item.msg;
			url = `https://api-cloudgame.mihoyo.com/hk4e_cg_cn/gamer/api/ackNotification?id=${reward_id}`;
			res = await superagent.post(url).set(this.getyunHeader()).timeout(10000);
			let log_msg = `\n领取奖励,ID:${reward_id},Msg:${reward_msg}`;
			Bot.logger.info(log_msg)
			sendMSg += log_msg
		}
		resObj.sendMSg = sendMSg;
		return resObj;
	}

	async logyunGenshen() {
		let url = `https://api-cloudgame.mihoyo.com/hk4e_cg_cn/wallet/wallet/get`;
		let res = await superagent.get(url).set(this.getyunHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		let data = resObj.data
		let log_msg = `米云币:${data?.coin?.coin_num},免费时长:${data?.free_time?.free_time}分钟,总时长:${data.total_time}分钟`;
		resObj.log_msg = log_msg
		return resObj
	}
	async updCookie(){
		let url = `https://api-takumi.mihoyo.com/auth/api/getCookieAccountInfoBySToken`;
		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
	    return resObj;
	}
	async stoken(cookie, e) {
		this.e = e;
		let datalist = this.getStoken(e.user_id) || {}
		if (Object.keys(datalist).length > 0) {
			return true;
		}
		const map = this.getCookieMap(cookie);
		let loginTicket = map.get("login_ticket");
		const loginUid = map.get("login_uid") ? map.get("login_uid") : map.get("ltuid");
		if (isV3) {
			loginTicket = gsCfg.getBingCookie(e.user_id).login_ticket
		}
		const url = "https://api-takumi.mihoyo.com/auth/api/getMultiTokenByLoginTicket?login_ticket=" +
			loginTicket + "&token_types=3&uid=" + loginUid;
		fetch(url, {
			"headers": {
				"x-rpc-device_id": "zxcvbnmasadfghjk123456",
				"Content-Type": "application/json;charset=UTF-8",
				"x-rpc-client_type": "",
				"x-rpc-app_version": "",
				"DS": "",
				"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/%s",
				"Referer": "cors",
				"Accept-Encoding": "gzip, deflate, br",
				"x-rpc-channel": "appstore",
			},
			"method": "GET"
		}).then(
			function(response) {
				if (response.status !== 200) {
					return false;
				}
				response.json().then(function(data) {
					if (!data.data) {
						return false;
					}
					datalist[e.uid] = {
						stuid: map.get("account_id"),
						stoken: data.data.list[0].token,
						ltoken: data.data.list[1].token,
						uid: e.uid,
						userId: e.user_id,
						is_sign: true
					}
					gsCfg.saveBingStoken(e.user_id, datalist)
					return true;
				});
			}
		).catch(function(err) {
			return false;
		});
		return true;
	}
	/** 米游社 api headers */
	// 签到的 headers
	getpubHeaders(board) {
		const randomStr = utils.randomString(6);
		const timestamp = Math.floor(Date.now() / 1000)
		let sign = md5(`salt=${saltWeb}&t=${timestamp}&r=${randomStr}`);
		return {
			'accept-language': 'zh-CN,zh;q=0.9,ja-JP;q=0.8,ja;q=0.7,en-US;q=0.6,en;q=0.5',
			'x-rpc-device_id': DEVICE_ID,
			'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.34.1',
			Referer: board.getReferer(),
			Host: 'api-takumi.mihoyo.com',
			'x-rpc-channel': 'appstore',
			'x-rpc-app_version': APP_VERSION,
			'x-requested-with': 'com.mihoyo.hyperion',
			'x-rpc-client_type': '5',
			'Content-Type': 'application/json;charset=UTF-8',
			DS: `${timestamp},${randomStr},${sign}`,
			'Cookie': this.cookie
		}
	}
	//社区签到ds
	get_ds2(q = "", b) {
		let n = salt2
		let i = Math.floor(Date.now() / 1000)
		let r = _.random(100001, 200000)
		let add = `&b=${b}&q=${q}`
		let c = md5("salt=" + n + "&t=" + i + "&r=" + r + add)
		return `${i},${r},${c}`
	}

	// 米游币任务的 headers
	_getHeader() {
		const randomStr = utils.randomString(6);
		const timestamp = Math.floor(Date.now() / 1000)
		let sign = md5(`salt=${salt}&t=${timestamp}&r=${randomStr}`);
		let ds = `${timestamp},${randomStr},${sign}`
		if (this.forumId) {
			ds = this.get_ds2("", JSON.stringify({
				gids: this.forumId * 1
			}));
			this.forumId = "";
		}
		return {
			'Cookie': this.cookies,
			"x-rpc-channel": "miyousheluodi",
			'x-rpc-device_id': DEVICE_ID,
			'x-rpc-app_version': APP_VERSION,
			"x-rpc-device_model": "Mi 10",
			'x-rpc-device_name': DEVICE_NAME,
			'x-rpc-client_type': '2', // 1 - iOS, 2 - Android, 4 - Web
			'DS': ds,
			"Referer": "https://app.mihoyo.com",
			"x-rpc-sys_version": "12",
			"Host": "bbs-api.mihoyo.com",
			"User-Agent": "okhttp/4.8.0",
			// 'DS': `1602569298,k0xfEh,07f4545f5d88eac59cb1257aef74a570`
		}
	}
	//云原神签到头
	getyunHeader() {
		return {
			"x-rpc-combo_token": this.yuntoken, //这里填你的ck
			"x-rpc-client_type": "2",
			"x-rpc-app_version": "1.3.0",
			"x-rpc-sys_version": "11",
			"x-rpc-channel": "mihoyo",
			"x-rpc-device_id": this.devId, //这里填获取到的设备Id
			"x-rpc-device_name": "Xiaomi Mi 10 Pro",
			"x-rpc-device_model": "Mi 10 Pro",
			"x-rpc-app_id": "1953439974",
			"Referer": "https://app.mihoyo.com",
			"Content-Length": "0",
			"Host": "api-cloudgame.mihoyo.com",
			"Connection": "Keep-Alive",
			"Accept-Encoding": "gzip",
			"User-Agent": "okhttp/3.14.9"
		}
	}
	//一个奇怪的请求头
	getHeader() {
		return {
			'x-rpc-app_version': mhyVersion,
			'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)  AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.11.1`,
			'x-rpc-client_type': '5',
			'Referer': 'https://webstatic.mihoyo.com/',
			'Origin': 'https://webstatic.mihoyo.com',
		}
	}
	old_version_get_ds_token() {
		let n = 'N50pqm7FSy2AkFz2B3TqtuZMJ5TOl3Ep'
		let i = Math.floor(Date.now() / 1000)
		let r = utils.randomString(6)
		let c = md5('salt=' + n + '&t=' + i + '&r=' + r)
		return i + ',' + r + ',' + c
	}
	async authkey(e) {
		let url = `${web_api}/binding/api/genAuthKey`;
		let HEADER = this.getHeader();
		HEADER['Cookie'] = this.cookies
		HEADER['DS'] = this.old_version_get_ds_token()
		HEADER['User-Agent'] = 'okhttp/4.8.0'
		HEADER['x-rpc-app_version'] = '2.35.2'
		HEADER['x-rpc-sys_version'] = '12'
		HEADER['x-rpc-client_type'] = '5'
		HEADER['x-rpc-channel'] = 'mihoyo'
		HEADER['x-rpc-device_id'] = utils.randomString(32).toUpperCase();
		HEADER['x-rpc-device_name'] = utils.randomString(_.random(1, 10));
		HEADER['x-rpc-device_model'] = 'Mi 10'
		HEADER['Referer'] = 'https://app.mihoyo.com'
		HEADER['Host'] = 'api-takumi.mihoyo.com'
		let data = {
			'auth_appid': 'webview_gacha',
			'game_biz': 'hk4e_cn',
			'game_uid': this.e.uid * 1,
			'region': this.e.region,
		}
		let res = await superagent.post(url).set(HEADER).send(JSON.stringify(data));
		let resObj = JSON.parse(res.text);
		return resObj
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
	getStoken(userId) {
		let file = `${YamlDataUrl}/${userId}.yaml`
		try {
			let ck = fs.readFileSync(file, 'utf-8')
			ck = YAML.parse(ck)
			if (ck?.uid) {
				let datalist = {};
				ck.userId = this.e.user_id
				datalist[ck.uid] = ck;
				ck = datalist
				gsCfg.saveBingStoken(this.e.user_id, datalist)
			}
			return ck[this.e.uid] || {}
		} catch (error) {
			return {}
		}
	}
	//==== 签到任务 ====
	// @todo 签到任务大概率是接口通用的, 只是部分参数不一样, 可以构造通用方法, 方便后续整合崩2, 事件簿, 铁道等

	// 获取账号信息 通用
	async getUserInfo(board) {
		let res = await superagent.get(
				`https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=${board.biz}`)
			.set(this
				.getpubHeaders(board)).timeout(10000);
		let resObj = JSON.parse(res.text);
		let data = resObj.data
		// console.log(resObj)
		if (resObj.retcode != 0) {
			return resObj
		}
		// const game_uid = data?.list?. [0]?.game_uid
		// const region = data?.list?. [0]?.region
		// const nickname = data?.list?. [0]?.nickname
		return resObj
	}
	// 游戏签到操作查询
	async isPostSign(board, game_uid, region) {
		let url =
			`${web_api}/event/luna/info?lang=zh-cn`
		if (board.name == "原神") {
			url = `${web_api}/event/bbs_sign_reward/info`
		}
		if (board.name == "崩坏2" || board.name == "未定事件簿") {
			url = `${web_api}/event/luna/info?lang=zh-cn`
		}
		url += `${board.name == "原神"?"?":"&"}region=${region}&act_id=${board.actid}&uid=${game_uid}`
		let res = await superagent.get(url).set(this.getpubHeaders(board)).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj
	}
	// 游戏签到操作 	
	async postSign(board, game_uid, region) {
		let url =
			`${web_api}/event/luna/sign`
		if (board.name == "原神") {
			url = `${web_api}/event/bbs_sign_reward/sign`
		}
		if (board.name == "崩坏2" || board.name == "未定事件簿") {
			url = `${web_api}/event/luna/sign`
		}
		url += `?region=${region}&act_id=${board.actid}&uid=${game_uid}`
		let res = await superagent.post(url).set(this.getpubHeaders(board)).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj
	}


}
