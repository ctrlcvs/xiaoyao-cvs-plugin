import {
	isV3
} from '../components/Changelog.js'
import mys from "../model/mhyTopUpLogin.js"
import Common from "../components/Common.js";
import { bindStoken } from './user.js'
import utils from '../model/mys/utils.js';
import {segment} from 'oicq'
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
		reg: '^#?原神(微信)?充值(微信)?(.*)$',
		/** 执行方法 */
		describe: '原神充值（离线）'
	}, payOrder: {
		reg: "^#?商品列表",
		describe: '原神充值商品列表'
	},payOrder:{
		reg:'^#?订单查询',
		describe:'充值订单查询'
	}
}


export async function payOrder(e){
	console.log(e)
	let Mys = new mys(e)
	if(/商品列表/.test(e.msg)){
		return await Mys.showgoods()
	}else if (/订单查询/.test(e.msg)) {
		return await Mys.checkOrder()
	}else if(e.msg.includes('充值')){
		return await Mys.GetCode()
	}
	return false;
} 

export async function qrCodeLogin(e, { render }) {
	let Mys = new mys(e)
	let res = await Mys.qrCodeLogin()
	if (!res?.data) return false;
	e._reply=e.reply
	let sendMsg=[segment.at(e.user_id),'\n请扫码以完成绑定\n']
	e.reply=(msg)=>{
		sendMsg.push(msg)
	}
	await Common.render(`qrCode/index`, {
		url: res.data.url
	}, {
		e,
		render,
		scale: 1.2,retMsgId: true 
	})
	let r= await e._reply(sendMsg)
	utils.recallMsg(e,r,30) //默认30，有需要请自行修改
	res = await Mys.GetQrCode(res.data.ticket)
	if (!res) return true;
	await bindSkCK(e,res)
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

export async function bindSkCK(e, res) {
	e.msg = res?.stoken, e.raw_message = res?.stoken
	e.isPrivate = true
	await bindStoken(e)
	e.ck = res?.cookie, e.msg = res.cookie, e.raw_message = res.cookie;
	if (isV3) {
		let userck = (await import(`file:///${_path}/plugins/genshin/model/user.js`)).default
		await (new userck(e)).bing()
	} else {
		let {
			bingCookie
		} = (await import(`file:///${_path}/lib/app/dailyNote.js`))
		await bingCookie(e)
	}
}
