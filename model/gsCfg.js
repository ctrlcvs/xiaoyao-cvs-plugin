import YAML from 'yaml'
import fs from 'node:fs'
import {
	promisify
} from 'node:util'
import lodash from 'lodash'
import {
	isV3
} from '../components/Changelog.js';
const plugin = "xiaoyao-cvs-plugin"
/**
 * 配置文件
 * 主要用于处理 stoken以及云原神账号数据
 */
const _path = process.cwd();
class GsCfg {
	constructor() {

	}
	/** 通用yaml读取*/
	getfileYaml(path, name) {
		this.cpCfg('config', 'config')
		return YAML.parse(
			fs.readFileSync(path + name + ".yaml", 'utf8')
		)
	}
	cpCfg (app, name) {
	  if (!fs.existsSync(`./plugins/${plugin}/config`)) {
	    fs.mkdirSync(`./plugins/${plugin}/config`)
	  }
	
	  let set = `./plugins/${plugin}/config/${name}.yaml`
	  if (!fs.existsSync(set)) {
	    fs.copyFileSync(`./plugins/${plugin}/defSet/${app}/${name}.yaml`, set)
	  }
	}
	async getMasterQQ(){
		let qq;
		if(isV3){
			let config=(await import(`file://${_path}/lib/config/config.js`)).default
			qq=config.masterQQ[0]
		}else{
			qq=BotConfig.masterQQ[0]
		}
		return qq
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
	
	/** 读取所有用户绑定的ck */
	async getBingAllCk () {
	  let ck = {}
	  let ckQQ = {}
	  let qqCk={}
	  let dir = './data/MysCookie/'
	  let files = fs.readdirSync(dir).filter(file => file.endsWith('.yaml'))
	
	  const readFile = promisify(fs.readFile)
	
	  let promises = []
	
	  files.forEach((v) => promises.push(readFile(`${dir}${v}`, 'utf8')))
	
	  const res = await Promise.all(promises)
	
	  res.forEach((v) => {
	    let tmp = YAML.parse(v)
	    let qq
	    lodash.forEach(tmp, (item, uid) => {
	      qq = item.qq
	      ck[String(uid)] = item
		  if(!qqCk[String(item.qq)]) qqCk[String(item.qq)]=[]
		  qqCk[String(item.qq)].push(item)
	      if (item.isMain && !ckQQ[String(item.qq)]) {
	        ckQQ[String(item.qq)] = item
	      }
	    })
	    if (qq && !ckQQ[String(qq)]) {
	      ckQQ[String(qq)] = Object.values(tmp)[0]
	    }
	  })
	
	  return { ck, ckQQ,qqCk }
	}
	
	async getUserStoken(userId){
		try {
			let ck=YAML.parse(
				fs.readFileSync(`plugins/${plugin}/data/yaml/${userId}.yaml`, 'utf8')
			)
			return ck||{}
		}catch (ex) {
			return  {}
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
	saveBingStoken(userId, data) {
		let file = `./plugins/${plugin}/data/yaml/${userId}.yaml`
		if (lodash.isEmpty(data)) {
			fs.existsSync(file) && fs.unlinkSync(file)
			return
		}

		let ck = {}
		try {
			ck = YAML.parse(fs.readFileSync(file, 'utf-8')) || {}
		} catch (error) {
			ck = {}
		}
		// 旧版单账号 YAML 以 uid 为顶层字段，先归一化再合并
		if (ck?.uid) {
			const legacy = ck
			ck = { [legacy.uid]: legacy }
		}
		// 必须合并全部新条目；只合并第一个 key 会在多 UID 账号下漏掉其它角色
		Object.assign(ck, data)
		fs.writeFileSync(file, YAML.stringify(ck), 'utf8')
	}
}


export default new GsCfg()
