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
let role_user = Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/dailyNote/json/`, "dispatch_time");

let path_url = ["dailyNote", "xiaoyao_Note"];
let path_img = ["background_image", "/icon/bg"];
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
	let cookie, uid, res;
	if (isV3) {
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
	let data = res.data;
	//推送任务
	if (e.isTask && data.current_resin < e.sendResin) {
		return false;
	}
	if (e.isTask) {
		Bot.logger.mark(`体力推送:${e.user_id}`);
	}
	let nowDay = moment(new Date()).format("DD");
	let resinMaxTime;
	let resinMaxTime_mb2;
	let resinMaxTime_mb2Day;
	if (data.resin_recovery_time > 0) {
		resinMaxTime = new Date().getTime() + data.resin_recovery_time * 1000;
		let maxDate = new Date(resinMaxTime);
		resinMaxTime = moment(maxDate).format("HH:mm");
		let Time_day = await dateTime_(maxDate)
		resinMaxTime_mb2 = Time_day + moment(maxDate).format("hh:mm");
		if (moment(maxDate).format("DD") != nowDay) {
			resinMaxTime_mb2Day = `明天`;
			resinMaxTime = `明天 ${resinMaxTime}`;
		} else {
			resinMaxTime_mb2Day = `今天`;
			resinMaxTime = ` ${resinMaxTime}`;
		}
	}
	for (let val of data.expeditions) {
		if (val.remained_time <= 0) {
			val.percentage = 0;
		}
		if (val.remained_time > 0) {
			val.dq_time = val.remained_time;
			val.remained_time = new Date().getTime() + val.remained_time * 1000;
			var urls_avatar_side = val.avatar_side_icon.split("_");
			let Botcfg;
			if (isV3) {
				Botcfg = (await import(`file://${_path}/plugins/genshin/model/gsCfg.js`)).default;
			} else {
				Botcfg = YunzaiApps.mysInfo
			}
			let id = Botcfg.roleIdToName(urls_avatar_side[urls_avatar_side.length - 1].replace(
				/(.png|.jpg)/g, ""));
			let name = Botcfg.roleIdToName(id, true);
			var time_cha = 20;
			if (role_user["12"].includes(name)) {
				time_cha = 15;
			}
			val.percentage = ((val.dq_time / 60 / 60 * 1 / time_cha) * 100 / 10).toFixed(0) * 10;
			let remainedDate = new Date(val.remained_time);
			val.remained_time = moment(remainedDate).format("HH:mm");
			let Time_day = await dateTime_(remainedDate)
			if (moment(remainedDate).format("DD") != nowDay) {
				val.remained_mb2 = "明天" + Time_day + moment(remainedDate).format("hh:mm");
				val.remained_time = `明天 ${val.remained_time}`;
			} else {
				val.remained_mb2 = "今天" + Time_day + moment(remainedDate).format("hh:mm");
				val.remained_time = ` ${val.remained_time}`;
			}
			val.mb2_icon = val.avatar_side_icon
		}
	}

	let remained_time = "";
	if (data.expeditions && data.expeditions.length >= 1) {
		remained_time = lodash.map(data.expeditions, "remained_time");
		remained_time = lodash.min(remained_time);
		if (remained_time > 0) {
			remained_time = new Date().getTime() + remained_time * 1000;
			let remainedDate = new Date(remained_time);
			remained_time = moment(remainedDate).format("hh:mm");
			if (moment(remainedDate).format("DD") != nowDay) {
				remained_time = `明天 ${remained_time}`;
			} else {
				remained_time = ` ${remained_time}`;
			}
		}
	}

	let coinTime_mb2 = "";
	let coinTime_mb2Day = "";
	let coinTime = "";
	var chnNumChar = ["零", "明", "后", "三", "四", "五", "六", "七", "八", "九"];
	if (data.home_coin_recovery_time > 0) {
		let coinDate = new Date(new Date().getTime() + data.home_coin_recovery_time * 1000);
		let coinDay = Math.floor(data.home_coin_recovery_time / 3600 / 24);
		let coinHour = Math.floor((data.home_coin_recovery_time / 3600) % 24);
		let coinMin = Math.floor((data.home_coin_recovery_time / 60) % 60);
		if (coinDay > 0) {
			coinTime = `${coinDay}天${coinHour}小时${coinMin}分钟`;
			let dayTime = (24 - moment(new Date()).format('HH') + moment(coinDate).diff(new Date(), 'hours')) / 24
			coinTime_mb2Day = chnNumChar[dayTime.toFixed(0)] + "天";
			let Time_day = await dateTime_(coinDate)
			coinTime_mb2 = Time_day + moment(coinDate).format("hh:mm");
		} else {
			coinTime_mb2 = moment(coinDate).format("hh:mm");
			if (moment(coinDate).format("DD") != nowDay) {
				coinTime_mb2Day = "明天";
				coinTime = `明天 ${ moment(coinDate).format("hh:mm")}`;
			} else {
				coinTime_mb2Day = "今天";
				coinTime = moment(coinDate).format("hh:mm", coinDate);
			}
		}
	}

	let day = moment(new Date()).format("MM-DD HH:mm");
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	day += " " + week[new Date().getDay()];
	let day_mb2 = moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + week[new Date().getDay()];
	//参量质变仪
	if (data?.transformer?.obtained) {
		data.transformer.reached = data.transformer.recovery_time.reached;
		let recovery_time = "";
		if (data.transformer.recovery_time.Day > 0) {
			recovery_time += `${data.transformer.recovery_time.Day}天`;
		}
		if (data.transformer.recovery_time.Hour > 0) {
			recovery_time += `${data.transformer.recovery_time.Hour}小时`;
		}
		if (data.transformer.recovery_time.Minute > 0) {
			recovery_time += `${data.transformer.recovery_time.Minute}分钟`;
		}
		data.transformer.recovery_time = recovery_time;
	}
	let mb = Cfg.get("mb.len", 0) - 1;
	if (mb < 0) {
		mb = lodash.random(0, path_url.length - 1);
	}

	let urlType = note_file("xiaoyao");
	let objFile = Object.keys(urlType)
	if (objFile.length > 0) {
		objFile = objFile[lodash.random(0, objFile.length - 1)]
	}
	let img_path = `${urlType[objFile]}`;
	if (tempData[e.user_id] && tempData[e.user_id].type > -1) {
		mb = tempData[e.user_id].type;
		objFile = tempData[e.user_id].temp;
	}
	if (mb == 1) {
		for (var i = 0; i < 5 - data.expeditions.length; i++) {
			data.expeditions.push({
				remained_time: 0,
				remained_mb2: 0,
				percentage: 0,
				mb2_icon: ""
			})
		}
		img_path = `${urlType[objFile]}${path_img[mb]}`;
	}
	
	var image = fs.readdirSync(img_path);
	// console.log(fs.readdirSync(`./plugins/xiaoyao-cvs-plugin/resources/dailyNote/BJT-Templet/Template2`))
	var list_img = [];
	for (let val of image) {
		list_img.push(val)
	}
	var imgs = list_img.length == 1 ? list_img[0] : list_img[lodash.random(0, list_img.length - 1)];
	if (mb == 0 && objFile.includes(".")) {
		imgs = objFile
	}
	return await Common.render(`dailyNote/${path_url[mb]}`, {
		save_id: uid,
		uid: uid,
		coinTime_mb2Day,
		coinTime_mb2,
		urlType: encodeURIComponent(img_path.replace(
			/(\.\/plugins\/xiaoyao-cvs-plugin\/resources\/|\/icon\/bg)/g, '')).replace(/%2F/g, "/"),
		resinMaxTime_mb2Day,
		resinMaxTime,
		resinMaxTime_mb2,
		remained_time,
		coinTime,
		imgs: encodeURIComponent(imgs),
		day_mb2,
		day,
		...data,
	}, {
		e,
		render,
		scale: 1.2
	})
	return true;
}

async function dateTime_(time) {
	return moment(time).format("HH") < 6 ? "凌晨" : moment(time).format("HH") < 12 ? "上午" : moment(time).format(
			"HH") < 17.5 ? "下午" : moment(time).format("HH") < 19.5 ? "傍晚" : moment(time).format("HH") < 22 ? "晚上" :
		"深夜";
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
	let msg = e.msg.replace(/#|井|体力|模板|设置/g, "");

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
		let isUser= msg.includes('我的')
		let temp =tempData[e.user_id]?.temp;
		if(!temp&&isUser){
			e.reply("未获取到您设置的模板信息哦~")
			return true;
		}
		let xlmsg = msg.replace(/列表|我的/g, "") * 1 || 1
		let listLength=isUser?temp.length:keyType.length
		let sumCount = (listLength / 80 + 0.49).toFixed(0);
		xlmsg = sumCount - xlmsg > -1 ? xlmsg : sumCount == 0 ? 1 : sumCount;
		let xxmsg = (xlmsg - 1) <= 0 ? 0 : 80 * (xlmsg - 1)
		let count = 0;
		let msgData = [`模板列表共，第${xlmsg}页，共${listLength}张，\n您可通过【#体力模板设置1】来绑定你需要的体力模板~\n请选择序号~~\n当前支持选择的模板有:`];
		for (let [index, item] of keyType.entries()) {
			let msg_pass = [];
			let imgurl;
			if (item.includes(".")) {
				imgurl = await segment.image(`file:///${urlType[item]}`);
				item = item.split(".")[0];
			} else {
				imgurl = await segment.image(
					`file:///${urlType[item]}/icon/bg/${fs.readdirSync(`${urlType[item]}/icon/bg/`)[0]}`
				)
			}
			if(isUser&&!temp.includes(item)){
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
	if(!tempData[e.user_id]){
		tempData[e.user_id] = {
			temp: [],
			type: type,
		}
	}
	if (typeof tempData[e.user_id]["temp"] === "string") {
		temp = [tempData[e.user_id]["temp"], msg]
	} else {
		if(!tempData[e.user_id]["temp"].includes(msg)){
			temp = [...tempData[e.user_id]["temp"], msg]
		}
	}
	tempData[e.user_id] = {
		temp: temp,
		type: type,
	}
	fs.writeFileSync(tempDataUrl + "/tempData.json", JSON.stringify(tempData));
	init()
	e.reply("诶~这是你选的模板吗，模板设置成功了快用指令来试试吧~！")
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
			urlType[val] = url3  + val
		}
	}
	return urlType;
}
