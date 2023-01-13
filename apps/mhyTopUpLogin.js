import {
	isV3
} from '../components/Changelog.js'
import mys from "../model/mhyTopUpLogin.js"
import Common from "../components/Common.js";
import { bindStoken } from './user.js'
const _path = process.cwd();
export const rule = {
	qrCodeLogin: {
		reg: `^#(扫码|二维码|辅助)登录$`,
		describe: "扫码登录"
	},
	UserPassMsg: {
		reg: `^#(账号|密码)(密码)?登录$`,
		describe: "账号密码登录"
	},
	UserPassLogin: {
		reg: `^(.*)$`,
		describe: "账号密码登录"
	},
	// GetCode: {
	// 	/** 命令正则匹配 */
	// 	reg: '^#?原神(微信)?充值(微信)?(.*)$',
	// 	/** 执行方法 */
	// 	describe: '原神充值（离线）'
	// }, showgoods: {
	// 	reg: "^#?商品列表",
	// 	fnc: '原神充值商品列表'
	// }
}

export async function qrCodeLogin(e, { render }) {
	let Mys = new mys(e)
	let res = await Mys.qrCodeLogin()
	if (!res?.data) return false;
	await Common.render(`qrCode/index`, {
		url: res.data.url
	}, {
		e,
		render,
		scale: 1.2
	})
	res = await Mys.GetQrCode(res.data.ticket)
	if (!res) return true;
	await bindSkCK(res)
	return true;
}

export async function UserPassMsg(e) {
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
	return true;
}

export async function bindSkCK(e, res) {
	e.msg = res.stoken, e.raw_message = res.stoken
	await bindStoken(e)
	e.ck = res.cookie, e.msg = res.cookie, e.raw_message = res.cookie;
	if (isV3) {
		let userck = (await import(`file:///${_path}/plugins/genshin/model/user.js`)).default
		e.isPrivate = true
		await (new userck(e)).bing()
	} else {
		let {
			bingCookie
		} = (await import(`file:///${_path}/lib/app/dailyNote.js`))
		e.isPrivate = true;
		await bingCookie(e)
	}
}
