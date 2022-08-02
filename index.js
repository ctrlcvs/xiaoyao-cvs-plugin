// 适配V3 Yunzai，将index.js移至app/index.js
import {
	currentVersion,
	isV3
} from './components/Changelog.js'
import Data from './components/Data.js'

export * from './apps/index.js'
let index = {
	atlas: {}
}
if (isV3) {
	index = await Data.importModule('/plugins/xiaoyao-cvs-plugin/adapter', 'index.js')
}
export const atlas = index.atlas || {}
Bot.logger.info(`---------^_^---------`)
Bot.logger.info(`图鉴插件${currentVersion}初始化~`)

setTimeout(async function() {
	let msgStr = await redis.get('xiaoyao:restart-msg')
	let relpyPrivate = async function() {}
	if (!isV3) {
		let common = await Data.importModule('/lib', 'common.js')
		if (common && common.default && common.default.relpyPrivate) {
			relpyPrivate = common.default.relpyPrivate
		}
	}
	if (msgStr) {
		let msg = JSON.parse(msgStr)
		await relpyPrivate(msg.qq, msg.msg)
		await redis.del('xiaoyao:restart-msg')
		let msgs = [`当前图鉴版本: ${currentVersion}`, '您可使用 #图鉴版本 命令查看更新信息']
		await relpyPrivate(msg.qq, msgs.join('\n'))
	}
}, 1000)
