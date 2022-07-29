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
let YamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`
export default class MihoYoApi {
	constructor(e) {
		if (e) {
			this.e = e
			this.userId = String(e.user_id)
		}
		Data.createDir("", YamlDataUrl, false);
	}

	async forumSign(forumId) {
		const url = `https://api-takumi.mihoyo.com/apihub/sapi/signIn?gids=${forumId}`;
		let res = await superagent.post(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		// Bot.logger.mark(`ForumSign: ${res.text}`);
		return resObj;
	}

	async forumPostList(forumId) {
		const url =
			`https://api-takumi.mihoyo.com/post/api/getForumPostList?forum_id=${forumId}&is_good=false&is_hot=false&page_size=20&sort_type=1`;

		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		// logger.mark(`ForumList: ${res.text}`)
		return resObj;
	}

	async forumPostDetail(postId) {
		const url = `https://api-takumi.mihoyo.com/post/api/getPostFull?post_id=${postId}`;

		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		// logger.mark(`ForumDetail: ${res.text}`)
		return resObj;
	}

	async forumPostShare(postId) {
		const url = `https://api-takumi.mihoyo.com/apihub/api/getShareConf?entity_id=${postId}&entity_type=1`;
		let res = await superagent.get(url).set(this._getHeader()).timeout(10000);
		let resObj = JSON.parse(res.text);
		// Bot.logger.mark(`ForumShare: ${res.text}`)
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
		// Bot.logger.mark(`ForumVote: ${res.text}`)
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
		if(isV3){
			loginTicket=gsCfg.getBingCookie(e.user_id).login_ticket
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
	_getHeader() {
		const randomStr = utils.randomString(6);
		const timestamp = Math.floor(Date.now() / 1000)
		let data = this.getStoken(this.e.user_id);
		// console.log(data)
		// iOS sign
		let sign = md5(`salt=b253c83ab2609b1b600eddfe974df47b&t=${timestamp}&r=${randomStr}`);
		let cookie = `stuid=${data.stuid};stoken=${data.stoken};ltoken=${data.ltoken};`;
		return {
			'Cookie': cookie,
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
		let cookieArray = cookie.replace(/\s*/g,"").split(";");
		let cookieMap = new Map();
		for (let item of cookieArray) {
			let entry = item.split("=");
			if(!entry[0]) continue;
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
}
