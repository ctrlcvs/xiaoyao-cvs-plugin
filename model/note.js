import YAML from 'yaml'
import fs from 'node:fs'
import lodash from 'lodash'
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment'
import Common from "../components/Common.js";
import gsCfg from './gsCfg.js'
import {
	isV3
} from '../components/Changelog.js'
const plugin = 'xiaoyao-cvs-plugin'
const _path = process.cwd();
let path_url = ["dailyNote", "xiaoyao_Note"];
let path_img = ["background_image", "/icon/bg"];
/** 配置文件 */
export default class note {
	constructor(e) {
		if(e){
			this.e = e
		}
		this.Cfg = `./plugins/${plugin}/config/`
		this.role_user = Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/resources/dailyNote/json/`, "dispatch_time");
		gsCfg.cpCfg("config", "note")
		this.tempData = Data.readJSON(`./plugins/xiaoyao-cvs-plugin/data/NoteTemp`, "tempData")
		this.noteCfg = gsCfg.getfileYaml(this.Cfg, "note") || {}
		this.cfg = gsCfg.getfileYaml(`./plugins/xiaoyao-cvs-plugin/config/`, "config");
	}
	addNote() {
		this.isGroup()
		if (!this.isTaskAdmin()) return true;
		let userId = this.noteCfg[this.e.group_id]["task"] || [];
		if (!userId.includes(this.e.user_id)) {
			userId.push(this.e.user_id)
		}
		this.noteCfg[this.e.group_id]["task"] = userId
		this.saveNote(this.noteCfg)
		this.e.reply("体力推送开启成功~\n后续每天会为您推送体力")
	}
	delNote() {
		try {
			if (this.noteCfg[this.e.group_id]) {
				if (!this.isTaskAdmin()) return true;
				let userId = this.noteCfg[this.e.group_id]["task"] || [];
				if (userId.length > 0) {
					userId.splice(userId.indexOf(this.e.user_id),
						1) //.join('').replace(new RegExp(`${this.e.user_id}`)).split("")
					this.noteCfg[this.e.group_id]["task"] = userId
					this.saveNote(this.noteCfg)
					this.e.reply("体力推送关闭成功~\n后续将不会为您推送体力")
				}
			}
		} catch (e) {}
	}
	updNote() {
		this.isGroup()
		if (this.cfg.noteSetAuth === 2) {
			if (!this.e.isMaster) {
				this.e.reply('只有主人才能操作。')
				return false
			}
		}
		if (this.cfg.noteSetAuth === 1 && !this.e?.isMaster) {
			if (!(this.e.sender.role === 'owner' || this.e.sender.role === 'admin')) {
				this.e.reply('只有管理员才能操作。')
				return false
			}
		}
		let set = this.e.msg.includes("推送")
		if (set) {
			let bool = this.e.msg.includes("开启")
			this.noteCfg[this.e.group_id].isTask = bool
		} else {
			let num = this.e.msg.replace(/[^0-9]/ig, '')
			this.noteCfg[this.e.group_id].sendResin = Math.min(160, Math.max(20, num * 1 || 120));
		}
		this.saveNote(this.noteCfg)
		this.e.reply(this.e.msg.replace('#', '') + "操作成功~", true)
	}
	saveNote(data) {
		if (!data) return false;
		let yaml = YAML.stringify(data)
		fs.writeFileSync(`${this.Cfg}note.yaml`, yaml, 'utf8')
	}
	isTaskAdmin() {
		this.isGroup()
		if (!this.noteCfg[this.e.group_id]["isTask"]) {
			this.e.reply("群体力推送关闭了~\n请联系管理员开启功能~")
			return false;
		}
		return true;
	}
	isGroup(){
		if (!this.noteCfg[this.e.group_id]) { //首次直接设置
			this.noteCfg[this.e.group_id] = {
				"task": [],
				"isTask": true,
				"sendResin": 120
			}
		}
	}
	
	async getNote(cookie, uid, res,{render}){
		if (!res || res.retcode !== 0) return true
		
		let data = res.data;
		//推送任务
		if (this.e.isTask && data.current_resin < this.e.sendResin) {
			return true;
		}
		if (this.e.isTask) {
			Bot.logger.mark(`体力推送:${this.e.user_id}`);
		}
		let nowDay = moment(new Date()).format("DD");
		let resinMaxTime;
		let resinMaxTime_mb2;
		let resinMaxTime_mb2Day;
		if (data.resin_recovery_time > 0) {
			resinMaxTime = new Date().getTime() + data.resin_recovery_time * 1000;
			let maxDate = new Date(resinMaxTime);
			resinMaxTime = moment(maxDate).format("HH:mm");
			let Time_day = await this.dateTime_(maxDate)
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
				if (this.role_user["12"].includes(name)) {
					time_cha = 15;
				}
				val.percentage = ((val.dq_time / 60 / 60 * 1 / time_cha) * 100 / 10).toFixed(0) * 10;
				let remainedDate = new Date(val.remained_time);
				val.remained_time = moment(remainedDate).format("HH:mm");
				let Time_day = await this.dateTime_(remainedDate)
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
				let Time_day = await this.dateTime_(coinDate)
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
		let urlType = this.note_file("xiaoyao");
		let objFile = Object.keys(urlType)
		let defFile;
		if (objFile.length > 0) {
			objFile = objFile[lodash.random(0, objFile.length - 1)]
			defFile=objFile;
		}
		let img_path = `./plugins/xiaoyao-cvs-plugin/resources/dailyNote/${path_img[mb]}`;
		if (this.tempData[this.e.user_id] && this.tempData[this.e.user_id].type > -1&&this.tempData[this.e.user_id]?.temp?.length!==0) {
			// mb = tempData[e.user_id].type;
			if (typeof this.tempData[this.e.user_id]["temp"] === "string") {
				objFile = this.tempData[this.e.user_id]["temp"]
			} else {
				objFile = this.tempData[this.e.user_id].temp[lodash.random(0, this.tempData[this.e.user_id].temp.length - 1)];
			}
			if (objFile.includes(".")) { //对于模板类型处理
				mb = 0;
			} else {
				mb = 1
			}
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
			// console.log(urlType,objFile,path_img)
			img_path = `${urlType[objFile]}${path_img[mb]}`;
			if (!fs.existsSync(img_path)) {
				img_path=`${urlType[defFile]}${path_img[mb]}`;
			}
		}
		var image = fs.readdirSync(img_path);
		var list_img = [];
		for (let val of image) {
			list_img.push(val)
		}
		var imgs = list_img.length == 1 ? list_img[0] : list_img[lodash.random(0, list_img.length - 1)];
		if (mb == 0 && objFile.includes(".")) {
			imgs = objFile
		}
		await Common.render(`dailyNote/${path_url[mb]}`, {
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
			e:this.e,
			render,
			scale: 1.2
		})
		return !this.e?.isTask; 
	}
	
	async dateTime_(time) {
		return moment(time).format("HH") < 6 ? "凌晨" : moment(time).format("HH") < 12 ? "上午" : moment(time).format(
				"HH") < 17.5 ? "下午" : moment(time).format("HH") < 19.5 ? "傍晚" : moment(time).format("HH") < 22 ? "晚上" :
			"深夜";
	}
	
	note_file(xiaoyao) {
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
	
}
