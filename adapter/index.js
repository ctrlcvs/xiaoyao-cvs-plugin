import plugin from '../../../lib/plugins/plugin.js'
import * as Atlas from '../apps/index.js'
import { render } from './render.js'
import { checkAuth, getMysApi } from './mys.js'

export class atlas extends plugin {
  constructor () {
    super({
      name: 'xiaoyao-cvs-plugin',
      desc: '图鉴插件',
      event: 'message',
      priority: 50,
      rule: [{
        reg: '.+',
        fnc: 'dispatch'
      }]
    })
  }

  async dispatch (e) {
    let msg = e.raw_message
    e.checkAuth = async function (cfg) {
      return await checkAuth(e, cfg)
    }
    e.getMysApi = async function (cfg) {
      return await getMysApi(e, cfg)
    }
    msg = '#' + msg.replace(/#|＃/, '').trim()
    for (let fn in Atlas.rule) {
      let cfg = Atlas.rule[fn]
      if (Atlas[fn] && new RegExp(cfg.reg).test(msg)) {
        let ret = await Atlas[fn](e, {
          render
        })
        if (ret === true) {
          return true
        }
      }
    }

    return false
  }
}
