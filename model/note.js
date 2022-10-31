import YAML from 'yaml'
import fs from 'node:fs'
import lodash from 'lodash'
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment'
import gsCfg from './gsCfg.js'

const plugin = 'xiaoyao-cvs-plugin'
/** 配置文件 */
export default class note {
	constructor(e) {
		if(e){
			this.e = e
		}
		this.Cfg = `./plugins/${plugin}/config/`
		gsCfg.cpCfg("config", "note")
		this.noteCfg = gsCfg.getfileYaml(this.Cfg, "note") || {}
		this.cfg = gsCfg.getfileYaml(`./plugins/xiaoyao-cvs-plugin/config/`, "config");
	}
	addNote() {
		if (!this.noteCfg[this.e.group_id]) {
			this.noteCfg[this.e.group_id] = {
				"task": [],
				"isTask": true,
				"sendResin": 120
			}
		}
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
		if (!this.noteCfg[this.e.group_id]["isTask"]) {
			this.e.reply("群体力推送关闭了~\n请联系管理员开启功能~")
			return false;
		}
		return true;
	}
}
