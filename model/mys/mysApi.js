import md5 from 'md5'
import lodash from 'lodash'
import fetch from 'node-fetch'

export default class MysApi {
  /**
   * @param uid 游戏uid
   * @param cookie 米游社cookie
   * @param option 其他参数
   * @param option.log 是否显示日志
   */
  constructor (uid, cookie, option = {}) {
    this.uid = uid
    this.cookie = cookie
    this.server = this.getServer()

    let op = {
      log: true,
      ...option
    }
    this.option = op
  }

  getUrl (type, data = {}) {
    let host, hostRecord
    if (['cn_gf01', 'cn_qd01'].includes(this.server)) {
      host = 'https://api-takumi.mihoyo.com/'
      hostRecord = 'https://api-takumi-record.mihoyo.com/'
    }

    let urlMap = {
      /** 首页宝箱 */
      index: {
        url: `${hostRecord}game_record/app/genshin/api/index`,
        query: `role_id=${this.uid}&server=${this.server}`
      },
      /** 深渊 */
      spiralAbyss: {
        url: `${hostRecord}game_record/app/genshin/api/spiralAbyss`,
        query: `role_id=${this.uid}&schedule_type=${data.schedule_type || 1}&server=${this.server}`
      },
      /** 角色详情 */
      character: {
        url: `${hostRecord}game_record/app/genshin/api/character`,
        body: { role_id: this.uid, server: this.server }
      },
      /** 树脂 */
      dailyNote: {
        url: `${hostRecord}game_record/app/genshin/api/dailyNote`,
        query: `role_id=${this.uid}&server=${this.server}`
      },
      /** 签到信息 */
      bbs_sign_info: {
        url: `${host}event/bbs_sign_reward/info`,
        query: `act_id=e202009291139501&region=${this.server}&uid=${this.uid}`,
        sign: true
      },
      /** 签到奖励 */
      bbs_sign_home: {
        url: `${host}event/bbs_sign_reward/home`,
        query: `act_id=e202009291139501&region=${this.server}&uid=${this.uid}`,
        sign: true
      },
      /** 签到 */
      bbs_sign: {
        url: `${host}event/bbs_sign_reward/sign`,
        body: { act_id: 'e202009291139501', region: this.server, uid: this.uid },
        sign: true
      },
      /** 详情 */
      detail: {
        url: `${host}event/e20200928calculate/v1/sync/avatar/detail`,
        query: `uid=${this.uid}&region=${this.server}&avatar_id=${data.avatar_id}`
      },
      /** 札记 */
      ys_ledger: {
        url: 'https://hk4e-api.mihoyo.com/event/ys_ledger/monthInfo',
        query: `month=${data.month}&bind_uid=${this.uid}&bind_region=${this.server}`
      },
      /** 养成计算器 */
      compute: {
        url: `${host}event/e20200928calculate/v2/compute`,
        body: data
      },
      /** 角色技能 */
      avatarSkill: {
        url: `${host}event/e20200928calculate/v1/avatarSkill/list`,
        query: `avatar_id=${data.avatar_id}`
      }
    }

    if (!urlMap[type]) return false

    let { url, query = '', body = '', sign = '' } = urlMap[type]

    if (query) url += `?${query}`
    if (body) body = JSON.stringify(body)

    let headers = this.getHeaders(query, body, sign)

    return { url, headers, body }
  }

  getServer () {
    let uid = this.uid
    switch (String(uid)[0]) {
      case '1':
      case '2':
        return 'cn_gf01' // 官服
      case '5':
        return 'cn_qd01' // B服
    }
    return 'cn_gf01'
  }

  async getData (type, data = {}, isForce = true) {
    let { url, headers, body } = this.getUrl(type, data)

    if (!url) return false

    let cahce = await redis.get(`Yz:genshin:mys:cache:${type}:${this.uid}`)
    if (cahce && !isForce) return JSON.parse(cahce)

    headers.Cookie = this.cookie
    let param = {
      headers,
      timeout: 10000
    }

    if (body) {
      param.method = 'post'
      param.body = body
    } else {
      param.method = 'get'
    }
    let response = {}
    let start = Date.now()
    try {
      response = await fetch(url, param)
    } catch (error) {
      logger.error(error)
      return false
    }

    if (!response.ok) {
      logger.error(response)
      return false
    }
    if (this.option.log) {
      logger.mark(`[米游社接口][${type}][${this.uid}] ${Date.now() - start}ms`)
    }
    const res = await response.json()

    if (!res) {
      logger.mark('mys接口没有返回')
      return false
    }

    if (res.retcode !== 0) {
      logger.debug(`[米游社接口][请求参数] ${url} ${JSON.stringify(param)}`)
    }

    res.api = type

    this.cache(res, type)

    return res
  }

  getHeaders (query = '', body = '', sign = false) {
    if (sign) {
      return {
        'x-rpc-app_version': '2.3.0',
        'x-rpc-client_type': 5,
        'x-rpc-device_id': this.getGuid(),
        'User-Agent': ' miHoYoBBS/2.3.0',
        DS: this.getDsSign()
      }
    }
    return {
      'x-rpc-app_version': '2.31.1',
      'x-rpc-client_type': 5,
      DS: this.getDs(query, body)
    }
  }

  getDs (q = '', b = '') {
    let n = ''
    if (['cn_gf01', 'cn_qd01'].includes(this.server)) {
      n = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
    }
    let t = Math.round(new Date().getTime() / 1000)
    let r = Math.floor(Math.random() * 900000 + 100000)
    let DS = md5(`salt=${n}&t=${t}&r=${r}&b=${b}&q=${q}`)
    return `${t},${r},${DS}`
  }

  /** 签到ds */
  getDsSign () {
    const n = 'h8w582wxwgqvahcdkpvdhbh2w9casgfl'
    const t = Math.round(new Date().getTime() / 1000)
    const r = lodash.sampleSize('abcdefghijklmnopqrstuvwxyz0123456789', 6).join('')
    const DS = md5(`salt=${n}&t=${t}&r=${r}`)
    return `${t},${r},${DS}`
  }

  getGuid () {
    function S4 () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
  }

  async cache (res, type) {
    if (!res || res.retcode !== 0) return
    redis.setEx(`Yz:genshin:mys:cache:${type}:${this.uid}`, 300, JSON.stringify(res))
  }
}
