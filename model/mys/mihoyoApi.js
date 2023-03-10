import utils from './utils.js';
import md5 from 'md5';
import _ from 'lodash';
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
import mys from "./mysTool.js"
import crypto from "crypto";
const _path = process.cwd();
const DEVICE_ID = utils.randomString(32).toUpperCase();
const DEVICE_NAME = utils.randomString(_.random(1, 10));
const yamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
let HttpsProxyAgent = ''
// 米游社的版块

export default class miHoYoApi {
	constructor(e) {
		if (e) {
			this.e = e
			this.cookie = e.cookie
			this.userId = String(e.user_id)
			this.yuntoken = e.yuntoken
			this.devId = e.devId
			this.isOs = false;
			if (this.e?.uid) {
				this.isOs = this.e?.uid[0] * 1 > 5
			}
			this.apiMap = {
				apiWeb: mys.web_api,
				saltweb: mys.saltWeb,
				saltSign: mys.salt
			}
			if (this.isOs) {
				this.apiMap = {
					apiWeb: mys.os_web_api,
					saltweb: mys.saltWeb, //os websalt待定中
					saltSign: mys.salt
				}
			}
			// //初始化配置文件
			let data = this.getStoken(this.e.user_id);
			if (data) {
				this.cookies = `stuid=${data.stuid};stoken=${data.stoken};ltoken=${data.ltoken};`;
				if (data?.mid) {
					this.cookies = `stuid=${data.stuid};stoken=${data.stoken};mid=${data.mid};`;
				}
				this.e.cookies = this.cookies
			}
		}
		Data.createDir("", yamlDataUrl, false);
	}

	getBody(name) {
		for (let item in mys.boards) {
			if (mys.boards[item].name === name) {
				return mys.boards[item]
			}
		}
	}

	async getData(type, data = {}) {
		let gameBody = this.getBody(data.name);
		let {
			url,
			headers,
			body
		} = this.getUrl(type, gameBody, data)

		if (!url) return false
		if (data.headers) {
			headers = {
				...headers,
				...data.headers
			}
			delete data.headers
		}
		let param = {
			headers,
			agent: await this.getAgent(),
			timeout: 10000
		}

		if (body) {
			param.method = 'post'
			param.body = body
		} else {
			param.method = 'get'
		}
		//用于处理特殊情况
		if(data.method){
			param.method=data.method
		}
		let response = {}
		let start = Date.now()
		try {
			response = await fetch(url, param)
		} catch (error) {
			logger.error(error.toString())
			return false
		}
		if (!response.ok) {
			Bot.logger.error(`[接口][${type}][${this.e.uid}] ${response.status} ${response.statusText}`)
			return false
		}

		let res = await response.text();
		// Bot.logger.mark(`[接口][${type}][${this.e.uid}] ${Date.now() - start}ms\n${res}`)
		if (res.startsWith('(')) {
			res = JSON.parse((res).replace(/\(|\)/g, ""))
		} else {
			res = JSON.parse(res)
		}
		if (!res) {
			Bot.logger.mark('mys接口没有返回')
			return false
		}
		if (res.retcode !== 0) {
			Bot.logger.debug(`[米游社接口][请求参数] ${url} ${JSON.stringify(param)}`)
		}
		res.api = type
		if (type == "loginByPassword") {
			res.aigis_data = JSON.parse(response.headers.get("x-rpc-aigis"))
		}
		return res
	}
	getUrl(type, board, data) {
		let urlMap = {
			userGameInfo: { //通用查询
				url: `${this.apiMap.apiWeb}/binding/api/getUserGameRolesByCookie`,
				query: `game_biz=${this.isOs ? board?.osbiz : board?.biz}`,
				types: 'sign'
			},
			isSign: board?.signUrl(data, "isSign", this.apiMap.apiWeb) || {},
			sign: board?.signUrl(data, "sign", this.apiMap.apiWeb) || {},
			home: board?.signUrl(data, "home", this.apiMap.apiWeb) || {},
			//bbs接口 hoyolab那边不是很需要 这边不进行优化处理
			bbsisSign: { //bbs 签到 （状态查询 米游币查询）
				url: `${mys.bbs_api}/apihub/sapi/getUserMissionsState`,
				types: 'bbs'
			},
			bbsSign: { //bbs讨论区签到
				url: `${mys.bbs_api}/apihub/app/api/signIn`,
				body: {
					gids: data.forumId * 1
				},
				sign: true,
				types: 'bbs'
			},
			bbsGetCaptcha: {
				url: `${mys.bbs_api}/misc/api/createVerification`,
				query: `is_high=false`,
				types: 'bbs'
			},
			bbsValidate: {
				url: `https://apiv6.geetest.com/ajax.php`,
				query: `gt=${data.gt}&challenge=${data.challenge}&lang=zh-cn&pt=3&client_type=web_mobile`,
			},
			bbsCaptchaVerify: {
				url: `${mys.bbs_api}/misc/api/verifyVerification`,
				body: {
					"geetest_challenge": data.challenge, //challenge,
					"geetest_validate": data.validate,
					"geetest_seccode": `${data.validate}|jordan`
				},
				types: 'bbs'
			},
			geeType: {
				url: `https://api.geetest.com/gettype.php`,
				query: `gt=${data.gt}`
			},
			//待定接口 用于获取用户米游社顶部的模块栏
			bbs_Businesses_url: {
				url: `${mys.bbs_api}/user/api/getUserBusinesses`,
				query: `uid={}` //????
			},
			bbsPostList: { //bbs讨论区签到
				url: `${mys.bbs_api}/post/api/getForumPostList`,
				query: `forum_id=${data.forumId}&is_good=false&is_hot=false&page_size=20&sort_type=1`,
				types: 'bbs'
			},
			bbsPostFull: { //bbs讨论区签到
				url: `${mys.bbs_api}/post/api/getPostFull`,
				query: `post_id=${data.postId}`,
				types: 'bbs'
			},
			bbsShareConf: { //bbs讨论区签到
				url: `${mys.bbs_api}/apihub/api/getShareConf`,
				query: `entity_id=${data.postId}&entity_type=1`,
				types: 'bbs'
			},
			bbsVotePost: { //bbs讨论区签到
				url: `${mys.bbs_api}/apihub/sapi/upvotePost`,
				body: {
					"post_id": data.postId,
					"is_cancel": false
				},
				types: 'bbs'
			},
			bbsGetCookie: {
				url: `${this.apiMap.apiWeb}/auth/api/getCookieAccountInfoBySToken`,
				query: `game_biz=hk4e_cn&${data.cookies}`,
				types: ''
			},
			bbsStoken: {
				url: `${this.apiMap.apiWeb}/auth/api/getMultiTokenByLoginTicket`,
				query: `login_ticket=${data.loginTicket}&token_types=3&uid=${data.loginUid}`,
				types: 'stoken'
			},
			//很抱歉由于有人恶意倒卖，不得已只能是关闭免费token了 开放免费供人使用还被恶意倒卖指责 开源确实不好弄捏
			validate: {
				url: `http://api.fuckmys.tk/geetest`,
				query: `token=${data?.getToken}&gt=${data.gt}&challenge=${data.challenge}`
			},
			cloudLogin: {
				url: `${mys.cloud_api}/hk4e_cg_cn/gamer/api/login`,
				types: 'cloud'
			},
			cloudReward: {
				url: `${mys.cloud_api}/hk4e_cg_cn/gamer/api/listNotifications`,
				query: `status=NotificationStatusUnread&type=NotificationTypePopup&is_sort=true`,
				types: 'cloud'
			},
			cloudGamer: {
				url: `${mys.cloud_api}/hk4e_cg_cn/gamer/api/ackNotification`,
				body: {
					id: data.reward_id
				},
				types: 'cloud'
			},
			cloudGet: {
				url: `${mys.cloud_api}/hk4e_cg_cn/wallet/wallet/get`,
				types: 'cloud'
			},
			authKey: {
				///account/auth/api/genAuthKey
				url: `${this.apiMap.apiWeb}/binding/api/genAuthKey`,
				// url:`https://gameapi-account.mihoyo.com/binding/api/genAuthKey`,
				body: {
					'auth_appid':'webview_gacha',//'apicdkey',// 'webview_gacha',
					'game_biz': this.isOs ? 'hk4e_global' : 'hk4e_cn',
					'game_uid': this.e.uid * 1,
					'region': this.e.region,
				},
				types: 'authKey'
			},
			getLtoken: {
				url: `${mys.pass_api}/account/auth/api/getLTokenBySToken`,
				query: `${data.cookies}`,
			},
			//用于手动过验证码，账号密码登录需要
			microgg: {
				url: `https://challenge.minigg.cn/manual/index.html`,
				query: `gt=${data.gt}&challenge=${data.challenge}`
			},
			microggVl: {
				url: `https://challenge.minigg.cn/manual/`,
				query: `callback=${data.challenge}`
			},
			loginByPassword: {
				url: `${mys.pass_api}/account/ma-cn-passport/app/loginByPassword`,
				body: {
					account: this.encrypt_data(data.account),
					password: this.encrypt_data(data.password)
				},
				types: 'pass'
			},
			qrCodeLogin: {
				url: `${mys.hk4_sdk}/hk4e_cn/combo/panda/qrcode/fetch`,
				body: {
					app_id: mys.app_id,
					device: data.device
				}
			},
			qrCodeQuery: {
				url: `${mys.hk4_sdk}/hk4e_cn/combo/panda/qrcode/query`,
				body: {
					app_id: mys.app_id,
					device: data.device,
					ticket: data.ticket
				}
			},
			getTokenByGameToken: {
				url: `${mys.pass_api}/account/ma-cn-session/app/getTokenByGameToken`,
				body: {
					account_id: data.uid * 1,
					game_token: data.token
				},
				types: 'pass'
			},
			getCookieAccountInfoByGameToken: {
				url: `${mys.web_api}/auth/api/getCookieAccountInfoByGameToken`,
				query: `account_id=${data.uid}&game_token=${data.token}`
			},
			createOrder:{
				url:`${mys.hk4_sdk}/hk4e_cn/mdk/atropos/api/createOrder`,
				body: {
					// "special_info": "topup_center",
					"order": data.order,
					"sign":  this.gen_sign(data.order)
				},
				types:'web'
			},
			goodsList:{
				url:`${mys.hk4_sdk}/hk4e_cn/mdk/shopwindow/shopwindow/fetchGoods`,
				body:{
					"released_flag": true,
					"game": "hk4e_cn",
					"region": "cn_gf01",
					"uid": "1",
					"account": "1"
				},
				types:'web'
			},
			checkOrder:{
				url:`${mys.hk4_sdk}/hk4e_cn/mdk/atropos/api/checkOrder`,
				query:`game=hk4e_cn&region=${utils.getServer(data.uid)}&order_no=${data.order_no}&uid=${data.uid}`,
				types:'web'
			}
		}
		if (!urlMap[type]) return false
		let {
			url,
			query = '',
			body = '',
			types = '',
			sign = ''
		} = urlMap[type]
		if (query) url += `?${query}`
		if (body) body = JSON.stringify(body)
		let headers = this.getHeaders(board, types, sign, body, query)
		return {
			url,
			headers,
			body
		}
	}

	// 签到的 headers
	getHeaders(board, type = "bbs", sign, body = {}, query = '') {
		let header = {};
		switch (type) {
			case "bbs":
				header = {
					'Cookie': this.cookies,
					"x-rpc-channel": "miyousheluodi",
					"x-rpc-auto_test": true,
					'x-rpc-device_id': DEVICE_ID,
					'x-rpc-app_version': mys.APP_VERSION,
					"x-rpc-device_model": "Mi 10",
					'x-rpc-device_name': DEVICE_NAME,
					'x-rpc-client_type': '2', // 1 - iOS, 2 - Android, 4 - Web
					'DS': (sign ? this.getDs2("", JSON.stringify({
						gids: board.forumid * 1
					}), mys.salt2) : this.getDs(mys.salt)),
					"Referer": "https://app.mihoyo.com",
					"x-rpc-sys_version": "12",
					"Host": "bbs-api.mihoyo.com",
					"User-Agent": "okhttp/4.8.0",
				}
				break;
			case "sign":
				header = {
					'accept-language': 'zh-CN,zh;q=0.9,ja-JP;q=0.8,ja;q=0.7,en-US;q=0.6,en;q=0.5',
					'x-rpc-device_id': DEVICE_ID,
					'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/${mys.APP_VERSION}`,
					Referer: board.getReferer(),
					Host: 'api-takumi.mihoyo.com',
					'x-rpc-channel': 'appstore',
					'x-rpc-app_version': mys.APP_VERSION,
					'x-requested-with': 'com.mihoyo.hyperion',
					'x-rpc-client_type': '5',
					'Content-Type': 'application/json;charset=UTF-8',
					DS: this.getDs(),
					'Cookie': this.cookie
				}
				if (this.isOs) {
					let os_Header = {
						app_version: '2.9.0',
						User_Agent: `Mozilla/5.0 (Linux; Android 9.0; SAMSUNG SM-F900U Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.73 Mobile Safari/537.36 miHoYoBBSOversea/2.9.0`,
						client_type: '2',
						'x-rpc-app_version': '2.9.0',
						Origin: 'https://webstatic-sea.hoyolab.com',
						X_Requested_With: 'com.mihoyo.hoyolab',
						Referer: 'https://webstatic-sea.hoyolab.com',
						DS: this.getDs(),
						'Cookie': this.cookie
					}
					header = os_Header
				}
				break;
			case "cloud":
				header = {
					// "x-rpc-combo_token": this.yuntoken, //云原神签到ck
					// "x-rpc-client_type": "2",
					// "x-rpc-app_version": "1.3.0",
					// "x-rpc-sys_version": "11",
					// "x-rpc-channel": "mihoyo",
					// "x-rpc-device_id": this.devId, //设备Id
					// "x-rpc-device_name": "Xiaomi Mi 10 Pro",
					// "x-rpc-device_model": "Mi 10 Pro",
					// "x-rpc-app_id": "1953439974",
					// "Referer": "https://app.mihoyo.com",
					// "Content-Length": "0",
					// "Host": "api-cloudgame.mihoyo.com",
					// "Connection": "Keep-Alive",
					// "Accept-Encoding": "gzip",
					'Host': 'api-cloudgame.mihoyo.com',
					'Accept': '*/*',
					'Referer': 'https://app.mihoyo.com',
					'x-rpc-combo_token': this.yuntoken,
					'Accept-Encoding': 'gzip, deflate',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 HBPC/12.1.1.301',
					"User-Agent": "okhttp/3.14.9"
				}
				break;
			case "authKey":
				header = {
					'x-rpc-app_version': mys.APP_VERSION,
					'User-Agent': 'okhttp/4.8.0',
					'x-rpc-client_type': '5',
					Referer: 'https://app.mihoyo.com',
					Origin: 'https://webstatic.mihoyo.com',
					Cookie: this.cookies,
					DS: this.getDs(this.isOs ? mys.osSalt : mys.saltWeb),
					'x-rpc-sys_version': '12',
					'x-rpc-channel': 'mihoyo',
					'x-rpc-device_id': DEVICE_ID,
					'x-rpc-device_name': DEVICE_NAME,
					'x-rpc-device_model': 'Mi 10',
					Host: 'api-takumi.mihoyo.com'
				}
				if (this.isOs) {
					let os_Header = {
						'x-rpc-app_version': '2.18.1',
						app_version: '2.18.1',
						client_type: '2',
						'x-rpc-client_type': '2',
						Origin: 'https://app.hoyolab.com',
						X_Requested_With: 'com.mihoyo.hoyolab',
						Referer: 'https://app.hoyolab.com',
						Host: 'api-os-takumi.mihoyo.com',
						'x-rpc-channel': 'hoyolab'
					}
					header = Object.assign({}, header, os_Header)
				}
				break;
			case "stoken":
				header = {
					"x-rpc-device_id": "zxcvbnmasadfghjk123456",
					"Content-Type": "application/json;charset=UTF-8",
					"x-rpc-client_type": "",
					"x-rpc-app_version": "",
					"DS": "",
					"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/%s",
					"Referer": "cors",
					"Accept-Encoding": "gzip, deflate, br",
					"x-rpc-channel": "appstore",
				}
				break;
			case "pass":
				header = {
					'x-rpc-device_id': DEVICE_ID,
					'x-rpc-app_id': "bll8iq97cem8",
					'x-rpc-device_name': DEVICE_NAME,
					"x-rpc-device_fp": utils.randomString(13),
					"x-rpc-device_model": utils.randomString(16),
					'x-rpc-app_version': mys.APP_VERSION,
					'x-rpc-game_biz': 'bbs_cn',
					"x-rpc-aigis": '',
					"Content-Type": "application/json;",
					"x-rpc-client_type": "2",
					"DS": this.getDs2('', body, mys.passSalt),
					"x-rpc-sdk_version": '1.3.1.2',
					"User-Agent": "okhttp/4.9.3",
					"Referer": "cors",
					'Host': 'passport-api.mihoyo.com',
					"Connection": 'Keep-Alive',
					"Accept-Encoding": "gzip, deflate, br",
					"x-rpc-channel": "appstore",
					Cookie: this.cookies,
				}
				break;
				case "web":
					header={
						"Accept": "application/json, text/plain, */*",
						"Accept-Encoding": "gzip, deflate, br",
						"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
						"Content-Type": "application/json;charset=UTF-8",
						"Pragma": "no-cache",
						"Referer": "https://webstatic.mihoyo.com/",
						"sec-ch-ua": '"Not?A_Brand";v="8", "Chromium";v="108", "Microsoft Edge";v="108"',
						"sec-ch-ua-mobile": "?0",
						"sec-ch-ua-platform": '"Windows"',
						"Sec-Fetch-Dest": "empty",
						"Sec-Fetch-Mode": "cors",
						"Sec-Fetch-Site": "same-site",
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54",
						"x-rpc-client_type": "4",
						"x-rpc-device_id": "3b401c79-e221-46b9-8ca5-2e072e367333",
						"x-rpc-language": "zh-cn",
						Cookie: this.cookie,
					}
					break
			default:
				header = {}
				break;
		}
		return header;
	}
	gen_sign(data) {
		if(!data) return ''
        let d = Object.keys(data).sort()
        let news = {}
        for (const item of d) {
            news[item] = data[item]
        }
        // let sign = this.HMCASHA256(Object.values(news).join(''))
		let sign = crypto.createHmac('sha256','6bdc3982c25f3f3c38668a32d287d16b').update(Object.values(news).join('')).digest('hex')
        return sign
    }
	getStoken(userId) {
		let file = `${yamlDataUrl}/${userId}.yaml`
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
	encrypt_data(data) {
		if (!data) return '';
		return crypto.publicEncrypt({
			key: mys.publicKey,
			padding: crypto.constants.RSA_PKCS1_PADDING
		}, data).toString("base64")
	}
	//社区签到ds
	getDs2(q = "", b, salt) {
		let i = Math.floor(Date.now() / 1000)
		let r = _.random(100001, 200000)
		let add = `&b=${b}&q=${q}`
		let c = md5("salt=" + salt + "&t=" + i + "&r=" + r + add)
		return `${i},${r},${c}`
	}

	getDs(salt = mys.saltWeb) {
		const randomStr = utils.randomString(6);
		const timestamp = Math.floor(Date.now() / 1000)
		let sign = md5(`salt=${salt}&t=${timestamp}&r=${randomStr}`);
		return `${timestamp},${randomStr},${sign}`
	}

	async getAgent() {
		if (isV3) {
			let cfg = await import(`file://${_path}/lib/config/config.js`);
			let proxyAddress = cfg.default.bot.proxyAddress
			if (!proxyAddress) return null
			if (proxyAddress === 'http://0.0.0.0:0') return null

			if (!this.isOs) return null

			if (HttpsProxyAgent === '') {
				HttpsProxyAgent = await import('https-proxy-agent').catch((err) => {
					logger.error(err)
				})

				HttpsProxyAgent = HttpsProxyAgent ? HttpsProxyAgent.default : undefined
			}
			if (HttpsProxyAgent) {
				return new HttpsProxyAgent(proxyAddress)
			}
		}
		return null
	}
}
