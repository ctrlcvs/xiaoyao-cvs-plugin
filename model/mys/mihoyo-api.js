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
const APP_VERSION = "2.2.0";
const DEVICE_ID = utils.randomString(32).toUpperCase();
const DEVICE_NAME = utils.randomString(_.random(1, 10));
const _path = process.cwd();
let YamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
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
		url: "https://bbs.mihoyo.com/wd/",
		getReferer() {
			return `https://webstatic.mihoyo.com/bbs/event/signin/bh2/index.html?bbs_auth_required=true&act_id=${this.actid}&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon`
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
			this.msgName = e.msg.replace(/#|签到|井|米游社|mys|社区/g, "")
			// //初始化配置文件
			let data = this.getStoken(this.e.user_id);
			if (data) {
				this.cookies = `stuid=${data.stuid};stoken=${data.stoken};ltoken=${data.ltoken};`;
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
			if (objData.retcode != 200) {
				return objData
			}
			if (!objData.nickname) {
				return {
					message: `未绑定${this.msgName}信息`
				}
			}
			// 获取签到信息和奖励信息 、、后续重新梳理补充
			// const {
			// 	name,
			// 	count
			// } = await this.getHonkai3rdSignInfo(objData.game_uid, objData.region, objData.nickname, boards.honkai3rd)
			// if (!name) {
			// 	return {
			// 		message: `获取签到信息和奖励信息异常`
			// 	}
			// }
			// 签到操作
			return await this.postSign(kkbody, objData.game_uid, objData.region)
		} catch (error) {
			logger.mark(`error.message`, error.message)
		}
	}
	async forumSign(forumId) {
		const url = `https://api-takumi.mihoyo.com/apihub/sapi/signIn?gids=${forumId}`;
		let res = await superagent.post(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		// Bot.logger.mark(`ForumSign: ${res.text}`);
		return resObj;
	}

	// 获取签到状态和奖励信息
	async getHonkai3rdSignInfo(game_uid, region, nickname, board) {
		let res = await superagent.get(
			`https://api-takumi.mihoyo.com/common/eutheniav2/index?region=${region}&act_id=${boards.honkai3rd.actid}&uid=${game_uid}`
		).set(this
			.getpubHeaders(board)).timeout(10000);
		let resObj = JSON.parse(res.text);
		// logger.mark(`ForumSign: ${res.text}`);
		let data = resObj.data
		const list = data?.sign?.list
		const signCount = data?.sign?. ['sign_cnt']
		if (list && signCount !== undefined) {
			const award = list?. [signCount]
			const status = award?.status
			// status 2 已签到, 1 未签到, 0 未到签到时间
			if (status === 0) {
				// 未到签到时间, 说明今天已签到, 当前奖励已经领取
				return "ok"
			} else if (status === 1) {
				// 未签到
				const name = award?.name
				const count = award?.cnt
				if (name && count) {
					if (status === 2) {} else {
						return {
							name,
							count
						}
					}
				} else {
					logger.mark(`ForumSign: error`);
				}
			}
		}
		return "";
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
	async stoken(cookie, e) {
		this.e = e;
		if (Object.keys(this.getStoken(e.user_id)).length != 0) {
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
					// console.log(data);
					if (!data.data) {
						return false;
					}
					let datalist = {
						stuid: map.get("account_id"),
						stoken: data.data.list[0].token,
						ltoken: data.data.list[1].token,
						uid: e.uid
					}
					let yamlStr = YAML.stringify(datalist);
					fs.writeFileSync(`${YamlDataUrl}/${e.user_id}.yaml`, yamlStr, 'utf8');
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
		let sign = md5(`salt=b253c83ab2609b1b600eddfe974df47b&t=${timestamp}&r=${randomStr}`);
		return {
			'accept-language': 'zh-CN,zh;q=0.9,ja-JP;q=0.8,ja;q=0.7,en-US;q=0.6,en;q=0.5',
			'x-rpc-device_id': DEVICE_ID,
			'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.3.0',
			Referer: board.getReferer(),
			Host: 'api-takumi.mihoyo.com',
			'x-rpc-channel': 'appstore',
			'x-rpc-app_version': '2.3.0',
			'x-requested-with': 'com.mihoyo.hyperion',
			'x-rpc-client_type': '5',
			'Content-Type': 'application/json;charset=UTF-8',
			DS: `${timestamp},${randomStr},${sign}`,
			'Cookie': this.cookie
		}
	}
	// 米游币任务的 headers
	_getHeader() {
		const randomStr = utils.randomString(6);
		const timestamp = Math.floor(Date.now() / 1000)
		let sign = md5(`salt=b253c83ab2609b1b600eddfe974df47b&t=${timestamp}&r=${randomStr}`);
		return {
			'Cookie': this.cookies,
			'Content-Type': 'application/json',
			'User-Agent': 'Hyperion/67 CFNetwork/1128.0.1 Darwin/19.6.0',
			'Referer': 'https://app.mihoyo.com',
			'x-rpc-channel': 'appstore',
			'x-rpc-device_id': DEVICE_ID,
			'x-rpc-app_version': APP_VERSION,
			'x-rpc-device_model': 'iPhone11,8',
			'x-rpc-device_name': DEVICE_NAME,
			'x-rpc-client_type': '1', // 1 - iOS, 2 - Android, 4 - Web
			'DS': `${timestamp},${randomStr},${sign}`
			// 'DS': `1602569298,k0xfEh,07f4545f5d88eac59cb1257aef74a570`
		}
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
			return ck
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
		if (resObj.retcode != 0) {
			return resObj
		}
		const game_uid = data?.list?. [0]?.game_uid
		const region = data?.list?. [0]?.region
		const nickname = data?.list?. [0]?.nickname
		return {
			game_uid,
			region,
			nickname,
			retcode: 200
		}
	}
	// 游戏签到操作 	
	async postSign(board, game_uid, region) {
		let web_api = `https://api-takumi.mihoyo.com`
		let url =
			`${web_api}/event/luna/sign`
		if (board.name == "原神") {
			url = `${web_api}/event/bbs_sign_reward/sign`
		}
		if (board.name == "崩坏2" || board.name == "未定事件簿") {
			url = `${web_api}/event/luna/info?lang=zh-cn`
		}
		url += `?region=${region}&act_id=${board.actid}&uid=${game_uid}`
		// if (board.name === "崩坏3") {
		// 	url = `${web_api}/event/luna/info?lang=zh-cn&region=${region}&act_id=${board.actid}&uid=${game_uid}`
		// }
		// console.log(this.e)
		let res = await superagent.post(url).set(this.getpubHeaders(board)).timeout(10000);
		let resObj = JSON.parse(res.text);
		return resObj
	}


}
