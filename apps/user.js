import MihoYoApi from "../model/mys/mihoyo-api.js"
import utils from '../model/mys/utils.js';
import promiseRetry from 'promise-retry';
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment';

import Common from "../components/Common.js";
import {
	isV3
} from '../components/Changelog.js';
import gsCfg from '../model/gsCfg.js';
import fs from "fs";
import {
	segment
} from "oicq";
import YAML from 'yaml'
import User from "../model/user.js"
export const rule = {
	userInfo: {
		reg: "^#*(ck|stoken|cookie|cookies|签到)查询$",
		describe: "用户个人信息查询"
	},
}
export async function userInfo(e,{render}){
	let user=new User(e);
	e.reply("正在获取角色信息请稍等...")
	let sumData=await user.getCkData()
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	let day = moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + week[new Date().getDay()];
	let ck= user.getCookieMap(e.cookie);
	return await Common.render(`user/userInfo`, {
		uid: e.user_id,
		ltuid:ck.get("ltuid"),
		save_id:e.user_id,
		day,
		sumData
	}, {
		e,
		render,
		scale: 1.2
	})
	return true;
}