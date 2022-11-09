import {
	segment
} from "oicq";
import fetch from "node-fetch";
import Common from "../components/Common.js";
import fs from "fs";
import {
	isV3
} from '../components/Changelog.js'
import lodash from "lodash";
import gsCfg from '../model/gsCfg.js'
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment';
import utils from "../model/mys/utils.js";
import note from '../model/note.js'
import User from "../model/user.js";
const _path = process.cwd();

let tempDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/NoteTemp`
let tempData = {};
init()

function init() {
	Data.createDir("", tempDataUrl, false);
	tempData = Data.readJSON(tempDataUrl, "tempData")
}
//#体力
export async function Note(e, {
	render
}, poke) {
	if (!Cfg.get("sys.Note") && !poke) {
		return false;
	}
	let notes = new note(e);
	let cookie, uid, res;
	if (isV3) {
		if(e.msg.replace(/全|全部/g,'多').includes('多')){
			let ck=await gsCfg.getBingCkSingle(e.user_id)
			if(Object.keys(ck).length==0){
				e.reply(`请先【#绑定cookie】`)
				return true;
			}
			let sendMsg=[]
			e._reply=e.reply;
			e.reply=((msg)=>{
				sendMsg.push(msg)
			})
			if(Object.keys(ck).length>1){
				e._reply(`多账号体力查询中请稍等...`)
			}
			for(let item of Object.keys(ck)){
				let res=await (await e.runtime.createMysApi(ck[item].uid,ck[item].ck)).getData('dailyNote')
				await notes.getNote(ck[item].ck,ck[item].uid,res,{render})
			}
			e._reply(sendMsg)
			return true;
		}
		let MysInfo = await import(`file://${_path}/plugins/genshin/model/mys/mysInfo.js`);
		res = await MysInfo.default.get(e, 'dailyNote')
		if (!res || res.retcode !== 0) return true
		uid = e.uid;
	} else {
		if (NoteCookie[e.user_id]) {
			cookie = NoteCookie[e.user_id].cookie;
			uid = NoteCookie[e.user_id].uid;
		} else if (BotConfig.dailyNote && BotConfig.dailyNote[e.user_id]) {
			cookie = BotConfig.dailyNote[e.user_id].cookie;
			uid = BotConfig.dailyNote[e.user_id].uid;
		} else {
			e.reply(`尚未配置，无法查询体力\n配置教程：${BotConfig.cookieDoc}`);
			return true;
		}
		const response = await getDailyNote(uid, cookie);
		if (!response.ok) {
			e.reply("米游社接口错误");
			return true;
		}
		res = await response.json();
		if (res.retcode == 10102) {
			if (!e.openDailyNote) {
				e.openDailyNote = true;
				await openDailyNote(cookie); //自动开启
				dailyNote(e);
			} else {
				e.reply("请先开启实时便笺数据展示");
			}
			return true;
		}
		if (res.retcode != 0) {
			if (res.message == "Please login") {
				Bot.logger.mark(`体力cookie已失效`);
				e.reply(`体力cookie已失效，请重新配置\n注意：退出米游社登录cookie将会失效！`);
				if (NoteCookie[e.user_id]) {
					// await MysUser.delNote(NoteCookie[e.user_id]);
					delete NoteCookie[e.user_id];
					saveJson();
				}
			} else {
				e.reply(`体力查询错误：${res.message}`);
				Bot.logger.mark(`体力查询错误:${JSON.stringify(res)}`);
			}
	
			return true;
		}
	
		//redis保存uid
		redis.set(`genshin:uid:${e.user_id}`, uid, {
			EX: 2592000
		});
	
		//更新
		if (NoteCookie[e.user_id]) {
			NoteCookie[e.user_id].maxTime = new Date().getTime() + res.data.resin_recovery_time * 1000;
			saveJson();
		}
	}
	return await notes.getNote(cookie,uid,res,{render})
}

async function getDailyNote(uid, cookie) {
	let mysApi = (await import(`file://${_path}/lib/app/mysApi.js`))
	let {
		url,
		headers,
		query,
		body
	} = mysApi.getUrl("dailyNote", uid);
	headers.Cookie = cookie;
	const response = await fetch(url, {
		method: "get",
		headers
	});
	return response;
}
export async function saveJson() {
	let path = "data/NoteCookie/NoteCookie.json";
	fs.writeFileSync(path, JSON.stringify(NoteCookie, "", "\t"));
}

export async function noteTask(e) {
	if (e.isPrivate) {
		return true;
	}
	let notes = new note(e);
	let user = new User(e)
	let {
		cookie
	} = await user.getCookie(e)
	e.isbool = e.msg.includes("开启")
	e.isgl = e.msg.includes("群")
	if (!cookie && e.isbool && !e.isgl) {
		e.reply("请先#绑定ck\n发送【体力帮助】获取教程")
		return false;
	}
	if (e.isgl) {
		notes.updNote(e)
	} else if (e.isbool && e.msg.includes("体力推送")) {
		notes.addNote()
	} else {
		notes.delNote()
	}
	return true;
}

//体力定时推送
export async function DailyNoteTask() {
	//推送cd，12小时一次
	let sendCD = 12 * 3600;
	let notes = new note();
	for (let item in notes.noteCfg) {
		let group = notes.noteCfg[item]
		if (!group?.isTask) continue;
		let taskUser = group.task;
		for (let i of taskUser) {
			let e = {
				user_id: i,
				qq: i,
				msg: "体力",
				sendResin: group.sendResin,
				isTask: true,
			}
			//今天已经提醒
			let sendkey = `xiaoyao:dailyNote:send:${i}`;
			let send = await redis.get(sendkey);
			if (!Bot.pickGroup(item).pickMember(i) || send) continue;
			let sendMsg = [segment.at(i * 1), "哥哥（姐姐）你的体力快满了哦~"]
			e.reply = (msg) => {
				sendMsg.push(msg)
			};
			let render;
			if (isV3) {
				let {
					getRender
				} = await import(`file://${_path}/plugins/xiaoyao-cvs-plugin/adapter/render.js`);
				render = await getRender()
			} else {
				let {
					getPluginRender
				} = await import(`file://${_path}/lib/render.js`);
				render = await getPluginRender()
			}
			let task = await Note(e, {
				render
			});
			if (task) {
				redis.set(sendkey, "1", {
					EX: sendCD
				});
				Bot.pickGroup(item).sendMsg(sendMsg)
			}
		}
	}
}

export async function pokeNote(e, {
	render
}) {
	if (!Cfg.get("note.poke")) {
		return false;
	}
	return await Note(e, {
		render
	}, "poke");
}


export async function Note_appoint(e) {
	let mbPath = `${_path}/plugins/xiaoyao-cvs-plugin/resources/dailyNote/`;
	let isDel= e.msg.includes("移除")
	let msg = e.msg.replace(/#|井|体力|模板|设置|移除/g, "");
	let All = ["默认", "随机", "0"];
	let urlType = note_file();
	let keyType = Object.keys(urlType);
	if (!isNaN(msg) && msg != 0) {
		if (msg > keyType.length) {
			e.reply(`没有${msg}的索引序号哦~`)
			return true;
		}
		msg = keyType[msg - 1];
	}
	let type = 0;
	if (msg.includes("列表")) {
		let isUser = msg.includes('我的')
		let temp = tempData[e.user_id]?.temp;
		if ((!temp||temp?.length===0) && isUser) {
			e.reply("未获取到您设置的模板信息哦~")
			return true;
		}
		let xlmsg = msg.replace(/列表|我的/g, "") * 1 || 1
		let listLength = isUser ? temp.length : keyType.length
		let sumCount = (listLength / 80 + 0.49).toFixed(0);
		xlmsg = sumCount - xlmsg > -1 ? xlmsg : sumCount == 0 ? 1 : sumCount;
		let xxmsg = (xlmsg - 1) <= 0 ? 0 : 80 * (xlmsg - 1)
		let count = 0;
		let msgData = [`模板列表共，第${xlmsg}页，共${listLength}张，\n您可通过【#体力模板设置1】来绑定你需要的体力模板~\n请选择序号~~\n当前支持选择的模板有:`];
		for (let [index, item] of keyType.entries()) {
			let msg_pass = [];
			let imgurl;
			let pathFile = urlType[item].replace(/\./, _path)
			if (item.includes(".")) {
				imgurl = await segment.image(`file:///${pathFile}`);
				item = item.split(".")[0];
			} else {
				imgurl = await segment.image(
					`file:///${pathFile}/icon/bg/${fs.readdirSync(`${pathFile}/icon/bg/`)[0]}`
				)
			}
			if (isUser && !temp?.includes(item)) {
				continue;
			}
			item = index + 1 + "." + item
			count++;
			if (msgData.length == 81) {
				break;
			}
			if (index < xxmsg) {
				continue;
			}
			msg_pass.push(item)
			if (imgurl) {
				msg_pass.push(imgurl)
			}
			msgData.push(msg_pass)
		}
		let endMsg = "";
		if (count < listLength) {
			endMsg = `更多内容请翻页查看\n如：#体力模板列表2`
		} else {
			endMsg = `已经到底了~~`
		}
		msgData.push(endMsg)
		await utils.replyMake(e, msgData, 0)
		return true;
	}
	if (keyType.includes(msg + ".png")) {
		msg = msg + ".png";
	}
	if (!keyType.includes(msg) && !All.includes(msg)) {
		e.reply("没有找到你想要的模板昵！可输入 【#体力模板列表】 查询当前支持的模板哦~~")
		return true;
	} else if (All.includes(msg)) {
		type = -1;
	} else {
		type = 1
		if (msg.includes(".")) {
			type = 0
		}
	}
	let temp = [];
	if (!tempData[e.user_id]) {
		tempData[e.user_id] = {
			temp: [],
			type: type,
		}
	}
	if (typeof tempData[e.user_id]["temp"] === "string") {
		temp = [tempData[e.user_id]["temp"], msg]
	} else {
		temp =tempData[e.user_id]["temp"]
		if (!tempData[e.user_id]["temp"]?.includes(msg)) {
			temp.push(msg)
		}
	}
	let sendMsg="诶~这是你选的模板吗，模板设置成功了快用指令来试试吧~！"
	if(isDel){
		if(temp.includes(msg)){
			temp.splice(temp.indexOf(msg),1) 
			sendMsg=`模板${msg}已移除~`
		}
	}
	tempData[e.user_id] = {
		temp: temp,
		type: type,
	}
	fs.writeFileSync(tempDataUrl + "/tempData.json", JSON.stringify(tempData));
	init()
	e.reply(sendMsg)
	return true;
}

const note_file = function(xiaoyao) {
	let url1 = `./plugins/xiaoyao-cvs-plugin/resources/dailyNote/Template/`
	let url2 = `./plugins/xiaoyao-cvs-plugin/resources/BJT-Templet/` //冤种情况。。
	let url3 = `./plugins/xiaoyao-cvs-plugin/resources/dailyNote/background_image/`
	var urlFile = fs.readdirSync(url1);
	var urlType = {};
	for (let val of urlFile) {
		if (val.includes(".")) continue;
		urlType[val] = url1 + val
	}
	if (fs.existsSync(url2)) {
		var bJTurlFile = fs.readdirSync(url2);
		for (let val of bJTurlFile) {
			if (!val.includes("Template")) continue;
			let file = fs.readdirSync(`${url2}${val}`);
			for (let va of file) {
				if (va.includes(".")) continue;
				urlType[va] = url2 + val + "/" + va
			}
		}
	}
	if (!xiaoyao) {
		var urlFileOne = fs.readdirSync(url3);
		for (let val of urlFileOne) {
			if (!val.includes(".")) continue;
			urlType[val] = url3 + val
		}
	}
	return urlType;
}
