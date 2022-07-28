import YAML from 'yaml'
import chokidar from 'chokidar'
import fs from 'node:fs'
import {
	promisify
} from 'node:util'
import lodash from 'lodash'

const plugin = "xiaoyao-cvs-plugin"
/** 配置文件 */
class GsCfg {
	constructor() {
		/** 默认设置 */
		this.defSetPath = `./plugins/${plugin}/defSet/`
		this.defSet = {}

		/** 用户设置 */
		this.configPath = `./plugins/${plugin}/config/`
		this.config = {}

		/** 监听文件 */
		this.watcher = {
			config: {},
			defSet: {}
		}
	}

	/**
	 * @param app  功能
	 * @param name 配置文件名称
	 */
	getdefSet(app, name) {
		return this.getYaml(app, name, 'defSet')
	}

	/** 用户配置 */
	getConfig(app, name) {
		let ignore = ['mys.pubCk', 'gacha.set']

		if (ignore.includes(`${app}.${name}`)) {
			return this.getYaml(app, name, 'config')
		}

		return {
			...this.getdefSet(app, name),
			...this.getYaml(app, name, 'config')
		}
	}

	/**
	 * 获取配置yaml
	 * @param app 功能
	 * @param name 名称
	 * @param type 默认跑配置-defSet，用户配置-config
	 */
	getYaml(app, name, type) {
		let file = this.getFilePath(app, name, type)
		let key = `${app}.${name}`

		if (this[type][key]) return this[type][key]

		this[type][key] = YAML.parse(
			fs.readFileSync(file, 'utf8')
		)

		this.watch(file, app, name, type)

		return this[type][key]
	}

	getFilePath(app, name, type) {
		if (type == 'defSet') return `${this.defSetPath}${app}/${name}.yaml`
		else return `${this.configPath}${app}.${name}.yaml`
	}

	/** 监听配置文件 */
	watch(file, app, name, type = 'defSet') {
		let key = `${app}.${name}`

		if (this.watcher[type][key]) return

		const watcher = chokidar.watch(file)
		watcher.on('change', path => {
			delete this[type][key]
			logger.mark(`[修改配置文件][${type}][${app}][${name}]`)
			if (this[`change_${app}${name}`]) {
				this[`change_${app}${name}`]()
			}
		})

		this.watcher[type][key] = watcher
	}

	get element() {
		return {
			...this.getdefSet('element', 'role'),
			...this.getdefSet('element', 'weapon')
		}
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
			for(let item in ck){
				ck=ck[item].ck
				return {ck,item};
			}
		} catch (error) {
			return {}
		}
	}
	saveBingCk(userId, data) {
		let file = `./data/MysCookie/${userId}.yaml`
		if (lodash.isEmpty(data)) {
			fs.existsSync(file) && fs.unlinkSync(file)
		} else {
			let yaml = YAML.stringify(data)
			fs.writeFileSync(file, yaml, 'utf8')
		}
	}

	/**
	 * 原神角色id转换角色名字
	 */
	roleIdToName(id) {
		let name = this.getdefSet('role', 'name')
		if (name[id]) {
			return name[id][0]
		}

		return ''
	}

	/** 原神角色别名转id */
	roleNameToID(keyword) {
		if (!this.nameID) {
			this.nameID = new Map()
			let nameArr = this.getdefSet('role', 'name')
			for (let i in nameArr) {
				for (let val of nameArr[i]) {
					this.nameID.set(val, i)
				}
			}
		}
		if (!isNaN(keyword)) keyword = Number(keyword)
		let roelId = this.nameID.get(keyword)
		return roelId || false
	}

	/**
	 * 原神角色武器长名称缩写
	 * @param name 名称
	 * @param isWeapon 是否武器
	 */
	shortName(name, isWeapon = false) {
		let other = {}
		if (isWeapon) {
			other = this.getdefSet('weapon', 'other')
		} else {
			other = this.getdefSet('role', 'other')
		}
		return other.sortName[name] ?? name
	}

	/** 公共配置ck文件修改hook */
	async change_myspubCk() {
		let MysInfo = await import('./mys/mysInfo.js').default
		await new MysInfo().addPubCk()
	}

	getGachaSet(groupId = '') {
		let config = this.getYaml('gacha', 'set', 'config')
		let def = config.default
		if (config[groupId]) {
			return {
				...def,
				...config[groupId]
			}
		}
		return def
	}

	getMsgUid(msg) {
		let ret = /[1|2|5][0-9]{8}/g.exec(msg)
		if (!ret) return false
		return ret[0]
	}

	/**
	 * 获取消息内原神角色名称，uid
	 * @param msg 判断消息
	 * @param filterMsg 过滤消息
	 * @return roleId 角色id
	 * @return name 角色名称
	 * @return alias 当前别名
	 * @return uid 游戏uid
	 */
	getRole(msg, filterMsg = '') {
		let alias = msg.replace(/#|老婆|老公|[1|2|5][0-9]{8}/g, '').trim()
		if (filterMsg) {
			alias = alias.replace(new RegExp(filterMsg, 'g'), '').trim()
		}

		/** 判断是否命中别名 */
		let roleId = this.roleNameToID(alias)
		if (!roleId) return false
		/** 获取uid */
		let uid = this.getMsgUid(msg) || ''

		return {
			roleId,
			uid,
			alias,
			name: this.roleIdToName(roleId)
		}
	}
}

export default new GsCfg()
