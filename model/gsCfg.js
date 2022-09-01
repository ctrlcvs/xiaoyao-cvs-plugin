import YAML from 'yaml'
import chokidar from 'chokidar'
import fs from 'node:fs'
import {
	promisify
} from 'node:util'
import lodash from 'lodash'
import {
	Data
} from "../components/index.js";

import {
	isV3
} from '../components/Changelog.js';

const plugin = "xiaoyao-cvs-plugin"
const pathPlugin=`./plugins/${plugin}/data/`
/** 
 * 配置文件
 * 主要用于处理 stoken以及云原神账号数据
 */
class GsCfg {
	constructor() {
		
	}
	async getyunToken(e) {
		let file = `${yunpath}/${e.user_id}.yaml`
		try {
			let ck = fs.readFileSync(file, 'utf-8')
			ck = YAML.parse(ck)
			e.devId = ck.devId;
			e.yuntoken = ck.yuntoken;
			return ck
		} catch (error) {
			return ""
		}
	}
	/** 通用yaml读取*/
	getfileYaml(path, name) {
		return YAML.parse(
			fs.readFileSync(path + name + ".yaml", 'utf8')
		)
	}
	/** 读取用户绑定的ck */
	async getBingCk() {
		let ck = {}
		let ckQQ = {}
		let dir = './data/MysCookie/'
		let files = fs.readdirSync(dir).filter(file => file.endsWith('.yaml'))
	
		const readFile = promisify(fs.readFile)
	
		let promises = []
	
		files.forEach((v) => promises.push(readFile(`${dir}${v}`, 'utf8')))
	
		const res = await Promise.all(promises)
	
		res.forEach((v) => {
			let tmp = YAML.parse(v)
			lodash.forEach(tmp, (v, i) => {
				ck[String(i)] = v
				if (v.isMain && !ckQQ[String(v.qq)]) {
					ckQQ[String(v.qq)] = v
				}
			})
		})
	
		return {
			ck,
			ckQQ
		}
	}
	/** 读取所有用户绑定的stoken */
	async getBingStoken() {
		let ck = []
		let ckQQ = {}
		let dir = `plugins/${plugin}/data/yaml/`
		let files = fs.readdirSync(dir).filter(file => file.endsWith('.yaml'))
	
		const readFile = promisify(fs.readFile)
	
		let promises = []
	
		files.forEach((v) => promises.push(readFile(`${dir}${v}`, 'utf8')))
		const res = await Promise.all(promises)
		res.forEach((v, index) => {
			let tmp = YAML.parse(v)
			ck.push(tmp)
		})
		return ck
	}
	getBingCkSingle(userId) {
		let file = `./data/MysCookie/${userId}.yaml`
		try {
			let ck = fs.readFileSync(file, 'utf-8')
			ck = YAML.parse(ck)
			return ck
		} catch (error) {
			return {}
		}
	}
	getBingCookie(userId) {
		let file = `./data/MysCookie/${userId}.yaml`
		try {
			let ck = fs.readFileSync(file, 'utf-8')
			ck = YAML.parse(ck)
			for (let item in ck) {
				let login_ticket;
				if (!ck[item].isMain) {
					continue;
				}
				login_ticket = ck[item]?.login_ticket
				ck = ck[item].ck
				return {
					ck,
					item,
					login_ticket
				};
			}
		} catch (error) {
			return {}
		}
	}
	getStoken(userId) {
		let file = `${YamlDataUrl}/${userId}.yaml`
		try {
			let ck = fs.readFileSync(file, 'utf-8')
			ck = YAML.parse(ck)
			if(ck?.uid){
				let datalist={};
				ck.userId=this.e.user_id
				datalist[ck.uid]=ck;
				ck=datalist
				this.saveBingStoken(this.e.user_id,datalist)
			}
			return ck[this.e.uid]||{}
		} catch (error) {
			return {}
		}
	}
	
	saveBingStoken(userId, data) {
		let file = `./plugins/${plugin}/data/yaml/${userId}.yaml`
		if (lodash.isEmpty(data)) {
			fs.existsSync(file) && fs.unlinkSync(file)
		} else {
			 fs.exists(file, (exists) => {
				if (!exists) {
					fs.writeFileSync(file, "", 'utf8')
				}
				let ck = fs.readFileSync(file, 'utf-8')
				let yaml = YAML.stringify(data)
				ck = YAML.parse(ck)
				if (ck?.uid) {
					fs.writeFileSync(file, yaml, 'utf8')
				} else {
					if(!ck[Object.keys(data)[0]]){
						ck = YAML.stringify(ck)
						fs.writeFileSync(file, yaml + ck, 'utf8')
					}
				}
			})
		}
	}
}


export default new GsCfg()
