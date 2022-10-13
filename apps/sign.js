import miHoYoApi from "../model/mys/mihoyoApi.js"
import utils from '../model/mys/utils.js';
import User from "../model/user.js"
import moment from 'moment';
import {
	Cfg,
	Data
} from "../components/index.js";
import {
	segment
} from "oicq";
import user from "../model/user.js";
export const rule = {
	sign: {
		reg: `^#*(原神|崩坏3|崩坏2|未定事件簿)签到$`,
		describe: "米社规则签到"
	},
	bbsSign: {
		reg: `^#*(米游社|mys|社区)(原神|崩坏3|崩坏2|未定事件簿|大别野|崩坏星穹铁道|绝区零|全部)签到$`,
		describe: "米游社米游币签到（理论上会签到全部所以区分开了）"
	},
	cloudSign:{
		reg: "^#*云原神签到$",
		describe: "云原神签到"
	},
	seach: {
		reg: `^#*(米游币|米币|云原神)查询$`,
		describe: "米游币、云原神查询"
	},
	cookiesDocHelp: {
		reg: "^#*(米游社|cookies|米游币|stoken|Stoken|云原神|云)(帮助|教程|绑定)$",
		describe: "cookies获取帮助"
	},
	signTask:{
		reg: `^#((米游币|云原神|米社(原神|崩坏3|崩坏2|未定事件簿)*))全部签到$`,
		describe: "米游币、云原神查询"
	},
}
export async function cloudSign(e){
	let user = new User(e);
	START = moment().unix();
	let res= await user.cloudSign()
	await replyMsg(e, res.message);
	return true;
}
export async function signTask(e){
	let user = new User(e);
	let task=e?.msg?.includes("米游币")?'bbs':e?.msg?.includes("云原神")?'cloud':e?.msg?.includes("米社")?'mys':''
	if(!task){
		task=e;
		e='';
	}
	if(task==="bbs"){
		await user.bbsTask(e)
	}
	if(task==="cloud"){
		await user.cloudTask(e)
	}
	if(task==="mys"){
		await user.signTask(e)
	}
	return true;
}
export async function cookiesDocHelp(e){
	let user = new User(e);
	e.reply(`【${e.msg.replace(/帮助|教程|绑定/g,"")}帮助】${await user.docHelp(e.msg)}`);
	return true;
}
export async function seach(e){
	let user = new User(e);
	START = moment().unix();
	let res
	if(e.msg.includes('币')){
		res= await user.bbsSeachSign()
	}else{
		res= await user.cloudSeach()
	}
	await replyMsg(e, res.message);
	return true;
}
export async function bbsSign(e) {
	let user = new User(e);
	START = moment().unix();
	let res = await user.bbsSeachSign()
	if(res.isOk&&res?.data?.can_get_points!==0){
		let msg=e.msg.replace(/(米游社|mys|社区|签到|#)/g,"")
		let forumData = await user.getDataList(msg);
		e.reply(`开始尝试${msg}社区签到预计${msg=='全部'?"10-20":"1-3"}分钟~`)
		res=await user.getbbsSign(forumData)
	}
	await replyMsg(e, res.message);
	return true;
}
const _path = process.cwd();
let START;
export async function sign(e) {
	let user = new User(e);
	START = moment().unix();
	let msg = e.msg.replace(/#|签到|井|米游社|mys|社区/g, "");
	let ForumData = await user.getDataList(msg);
	e.reply(`开始尝试${msg}签到\n预计${msg=='全部'?"60":"5-10"}秒~`)
	let res = await user.multiSign(ForumData);
	await replyMsg(e, res.message);
	return true;
}
async function replyMsg(e, resultMessage) {
	const END = moment().unix();
	Bot.logger.info(`运行结束, 用时 ${END - START} 秒`);
	resultMessage += `\n用时 ${END - START} 秒`;
	e.reply([segment.at(e.user_id), "\n" + resultMessage]);
}
