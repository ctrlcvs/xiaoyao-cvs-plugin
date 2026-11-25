import {
	isV3
} from '../components/Changelog.js'
import mys from "../model/mhyTopUpLogin.js"
import User from "../model/user.js"
import Common from "../components/Common.js";
import utils from '../model/mys/utils.js';
import {
	Cfg,
} from "../components/index.js";
import gsCfg from "../model/gsCfg.js";
const _path = process.cwd();
export const rule = {
	qrCodeLogin: {
		reg: `^#(扫码|二维码|辅助)(登录|绑定|登陆)$`,
		describe: "扫码登录"
	},
	UserPassMsg: {
		reg: `^#(账号|密码)(密码)?(登录|绑定|登陆)$`,
		describe: "账号密码登录"
	},
	UserPassLogin: {
		reg: `^账号(.*)密码(.*)$`,
		describe: "账号密码登录"
	},
	payOrder: {
		/** 命令正则匹配 */
		reg: '^#?((原神(微信)?充值(微信)?(.*))|((商品|充值)列表)|((订单|查询)(订单|查询)(.*)))$',
		/** 执行方法 */
		describe: '原神充值（离线）'
	}
}


export async function payOrder(e, { render }) {
	let Mys = new mys(e)
	if (/(商品|充值)列表/.test(e.msg)) {
		return await Mys.showgoods({ render })
	} else if (/(订单|查询)(订单|查询)/.test(e.msg)) {
		return await Mys.checkOrder()
	} else if (e.msg.includes('充值')) {
		return await Mys.GetCode({ render })
	}
	return false;
}

export async function qrCodeLogin(e, { render }) {
	let power = Cfg.get("mhy.qrcode")
	if (power === 3) {
		return false;
	} else {
		if (power == 2 && !e.isPrivate) {
			return false;
		}
		if (power == 1 && !e.isGroup) {
			return false;
		}
	}
	let Mys = new mys(e)
	let res = await Mys.qrCodeLogin()
	if (!res?.data) return false;
	e._reply = e.reply
	let sendMsg = [segment.at(e.user_id), '\n请扫码以完成绑定\n']
	e.reply = (msg) => {
		sendMsg.push(msg)
	}
	await Common.render(`qrCode/index`, {
		url: res.data.url
	}, {
		e,
		render,
		scale: 1.2, retMsgId: true
	})
	let r = await e._reply(sendMsg)
	utils.recallMsg(e, r, 30) //默认30，有需要请自行修改
	e.reply = e._reply
	res = await Mys.GetQrCode(res.data.ticket)
	if (!res) return true;
	await bindSkCK(e, res)
	return true;
}


export async function UserPassMsg(e) {
	if (!e.isPrivate) {
		return false;
	}
	let Mys = new mys(e)
	await Mys.UserPassMsg()
	return true;
}


export async function UserPassLogin(e) {
	if (!e.isPrivate) {
		return false;
	}
	let Mys = new mys(e)
	let res = await Mys.UserPassLogin();
	if (res) await bindSkCK(e, res)
	return res;
}

/**
 * 网页版/App 扫码拿到的 stoken 直接写入 xiaoyao 的 stoken YAML。
 * #刷新ck 依赖这份数据，不能再走已废弃的 getCookieAccountInfoBySToken。
 */
async function saveQrStoken(e, stokenStr, cookieStr) {
	const map = await utils.getCookieMap(stokenStr)
	const stuid = map.get("stuid") || map.get("uid")
	const stoken = map.get("stoken")
	const mid = map.get("mid")
	const ltoken = map.get("ltoken") || map.get("ltoken_v2") || ""
	if (!stuid || !stoken || !mid) return false

	let saved = false
	try {
		// 用 v2 Cookie 查一次角色列表，把 stoken 按游戏 UID 落盘，#更新抽卡记录等功能才能按 UID 找到
		e.sk = map
		e.cookie = cookieStr
		const user = new User(e)
		const datalist = {}
		for (const game of ["原神", "崩坏星穹铁道"]) {
			const board = user.getDataList(game)?.[0]
			if (!board) continue
			const res = await user.getData("userGameInfo", board, false)
			if (res?.retcode !== 0) continue
			for (const item of res.data?.list || []) {
				const uid = item.game_uid
				datalist[uid] = {
					stuid,
					stoken,
					ltoken,
					mid,
					uid,
					userId: e.user_id,
					is_sign: true,
					region_name: item.region_name,
					region: item.region
				}
				saved = true
			}
		}
		if (saved) gsCfg.saveBingStoken(e.user_id, datalist)
	} catch (err) {
		Bot.logger.warn(`[扫码登录] 查询角色列表失败：${err.message}`)
	}

	// 兜底：没有查到角色时，至少保留一条账号级 stoken，保证 #刷新ck 可用
	if (!saved) {
		gsCfg.saveBingStoken(e.user_id, {
			[stuid]: {
				stuid,
				stoken,
				ltoken,
				mid,
				uid: stuid,
				userId: e.user_id,
				is_sign: true
			}
		})
	}
	return true
}

export async function bindSkCK(e, res) {
	if (!res?.cookie) {
		await e.reply("扫码登录失败：未获取到Cookie")
		return
	}
	e.isPrivate = true
	if (res?.stoken) {
		e.msg = res.stoken, e.raw_message = res.stoken
		if (!(await saveQrStoken(e, res.stoken, res.cookie))) {
			Bot.logger.warn("[扫码登录] stoken 保存失败，可能影响 #刷新ck")
		}
	}
	e.ck = res.cookie, e.msg = res.cookie, e.raw_message = res.cookie;
	if (isV3) {
		let userck = (await import(`file://${_path}/plugins/genshin/model/user.js`)).default
		await (new userck(e)).bing()
	} else {
		let {
			bingCookie
		} = (await import(`file://${_path}/lib/app/dailyNote.js`))
		await bingCookie(e)
	}
}
