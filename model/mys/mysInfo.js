import MysApi from './mysApi.js'
import GsCfg from '../gsCfg.js'
import lodash from 'lodash'
import moment from 'moment'

/** 公共ck */
let pubCk = {}
/** 绑定ck */
let bingCkUid = {}
let bingCkQQ = {}
let bingCkLtuid = {}

export default class MysInfo {
  /** redis key */
  static keyPre = 'Yz:genshin:mys:'
  static key = {
    /** ck使用次数统计 */
    count: `${MysInfo.keyPre}ck:count`,
    /** ck使用详情 */
    detail: `${MysInfo.keyPre}ck:detail`,
    /** 单个ck使用次数 */
    ckNum: `${MysInfo.keyPre}ckNum:`,
    /** 已失效的ck使用详情 */
    delDetail: `${MysInfo.keyPre}ck:delDetail`,
    /** qq-uid */
    qqUid: `${MysInfo.keyPre}qq-uid:`
  }

  static tips = '请先#绑定cookie\n发送【体力帮助】查看配置教程'

  constructor (e) {
    if (e) {
      this.e = e
      this.userId = String(e.user_id)
    }
    /** 当前查询原神uid */
    this.uid = ''
    /** 当前ck信息 */
    this.ckInfo = {
      ck: '',
      uid: '',
      qq: '',
      ltuid: '',
      type: ''
    }

    this.auth = ['dailyNote', 'bbs_sign_info', 'bbs_sign_home', 'bbs_sign']
  }

  static async init (e, api) {
    let mysInfo = new MysInfo(e)

    /** 检查时间 */
    if (!mysInfo.checkTime()) return false

    /** 初始化绑定ck */
    await mysInfo.initBingCk()

    /** 初始化公共ck */
    await mysInfo.initPubCk()

    if (mysInfo.checkAuth(api)) {
      /** 获取ck绑定uid */
      mysInfo.uid = (await MysInfo.getSelfUid(e)).uid
    } else {
      /** 获取uid */
      mysInfo.uid = await MysInfo.getUid(e)
    }

    if (!mysInfo.uid) return false

    mysInfo.e.uid = mysInfo.uid

    /** 获取ck */
    await mysInfo.getCookie()

    /** 判断回复 */
    await mysInfo.checkReply()

    return mysInfo
  }

  /** 获取uid */
  static async getUid (e) {
    if (e.uid) return e.uid

    let { msg = '', at = '' } = e

    if (!msg) return false

    let uid = false
    /** at用户 */
    if (at) {
      uid = await redis.get(`${MysInfo.key.qqUid}${at}`)
      if (uid) return String(uid)
      e.reply('尚未绑定uid', false, { at })
      return false
    }

    let matchUid = (msg = '') => {
      let ret = /[1|2|5][0-9]{8}/g.exec(msg)
      if (!ret) return false
      return ret[0]
    }

    /** 命令消息携带 */
    uid = matchUid(msg)
    if (uid) return String(uid)

    /** 绑定的uid */
    uid = await redis.get(`${MysInfo.key.qqUid}${e.user_id}`)
    if (uid) return String(uid)

    /** 群名片 */
    uid = matchUid(e.sender.card)
    if (uid) return String(uid)

    e.reply('请先#绑定uid', false, { at })

    return false
  }

  /** 获取ck绑定uid */
  static async getSelfUid (e) {
    if (e.uid) return e.uid

    let { msg = '', at = '' } = e

    if (!msg) return false

    /** at用户 */
    if (at && (!bingCkQQ[at] || !bingCkQQ[at].uid)) {
      e.reply('尚未绑定cookie', false, { at })
      return false
    }

    if (!e.user_id || !bingCkQQ[e.user_id] || !bingCkQQ[e.user_id].uid) {
      e.reply(MysInfo.tips, false, { at })
      return false
    }

    return bingCkQQ[e.user_id]
  }

  /** 判断绑定ck才能查询 */
  checkAuth (api) {
    if (lodash.isObject(api)) {
      for (let i in api) {
        if (this.auth.includes(i)) {
          return true
        }
      }
    } else if (this.auth.includes(api)) {
      return true
    }
    return false
  }

  /**
   * @param api
   * * `index` 米游社原神首页宝箱等数据
   * * `spiralAbyss` 原神深渊
   * * `character` 原神角色详情
   * * `dailyNote` 原神树脂
   * * `bbs_sign` 米游社原神签到
   * * `detail` 详情
   * * `ys_ledger` 札记
   * * `compute` 养成计算器
   * * `avatarSkill` 角色技能
   */
  static async get (e, api, data = {}) {
    let mysInfo = await MysInfo.init(e, api)

    if (!mysInfo.uid || !mysInfo.ckInfo.ck) return false
    e.uid = mysInfo.uid

    let mysApi = new MysApi(mysInfo.uid, mysInfo.ckInfo.ck)

    let res
    if (lodash.isObject(api)) {
      let all = []
      lodash.forEach(api, (v, i) => {
        all.push(mysApi.getData(i, v))
      })
      res = await Promise.all(all)

      for (let i in res) {
        res[i] = await mysInfo.checkCode(res[i], res[i].api)
        if (res[i].retcode === 0) continue
        break
      }
    } else {
      res = await mysApi.getData(api, data)
      if (!res) return false

      res = await mysInfo.checkCode(res, api)
    }

    return res
  }

  async checkReply () {
    if (!this.uid) {
      this.e.reply('请先#绑定uid')
    }

    if (!this.ckInfo.ck) {
      if (lodash.isEmpty(pubCk)) {
        this.e.reply('请先配置公共查询ck')
      } else {
        this.e.reply('公共ck查询次数已用完，暂无法查询新uid')
      }
    }
  }

  async getCookie () {
    if (this.ckInfo.ck) return this.ckInfo.ck
    // 使用用户uid绑定的ck
    await this.getBingCK() ||
    // 使用uid已查询的ck
    await this.getCheckCK() ||
    // 使用用户绑定的ck
    await this.getBingCKqq() ||
    // 使用公共ck
    await this.getPublicCK()

    return this.ckInfo.ck
  }

  async getBingCK () {
    if (!bingCkUid[this.uid]) return false

    this.isSelf = true

    let ck = bingCkUid[this.uid]

    this.ckInfo = ck
    this.ckInfo.type = 'self'

    logger.mark(`[米游社查询][uid：${this.uid}]${logger.green(`[使用已绑定ck：${ck.ltuid}]`)}`)

    return ck.ck
  }

  async getCheckCK () {
    let ltuid = await redis.zScore(MysInfo.key.detail, this.uid)

    if (!ltuid) return false

    this.ckInfo.ltuid = ltuid
    this.ckInfo.type = 'public'

    /** 使用用户绑定ck */
    if (bingCkLtuid[ltuid]) {
      logger.mark(`[米游社查询][uid：${this.uid}]${logger.blue(`[已查询][使用用户ck：${ltuid}]`)}`)

      this.ckInfo = bingCkLtuid[ltuid]
      this.ckInfo.type = 'self'

      return this.ckInfo.ck
    }

    /** 公共ck */
    if (pubCk[ltuid]) {
      logger.mark(`[米游社查询][uid：${this.uid}]${logger.cyan(`[已查询][使用公共ck：${ltuid}]`)}`)

      this.ckInfo.ck = pubCk[ltuid]
      return this.ckInfo.ck
    }

    return false
  }

  /** 使用用户绑定的ck */
  async getBingCKqq () {
    /** 用户没有绑定ck */
    if (!bingCkQQ[this.userId]) return false

    let ck = bingCkQQ[this.userId]

    /** 判断用户ck使用次数 */
    let num = await redis.get(`${MysInfo.key.ckNum}${ck.ltuid}`)
    if (num && num >= 27) {
      logger.mark(`[米游社查询][uid：${this.uid}] 绑定用户ck次数已用完`)
      return
    }

    if (!num) num = 0

    this.ckInfo = ck
    this.ckInfo.type = 'bing'

    /** 插入查询详情 */
    await redis.zAdd(MysInfo.key.detail, { score: ck.ltuid, value: this.uid })
    /** 获取ck查询详情 */
    let count = await redis.zRangeByScore(MysInfo.key.detail, ck.ltuid, ck.ltuid)

    /** 用户ck也配置公共ck */
    if (pubCk[ck.ltuid]) {
      /** 统计ck查询次数 */
      redis.zAdd(MysInfo.key.count, { score: count.length || 1, value: String(ck.ltuid) })
    }
    this.expire(MysInfo.key.detail)

    /** 插入单个查询次数 */
    redis.setEx(`${MysInfo.key.ckNum}${ck.ltuid}`, this.getEnd(), String(count.length))

    logger.mark(`[米游社查询][uid：${this.uid}]${logger.blue(`[使用用户ck：${ck.ltuid}]`)}[次数:${++num}次]`)

    return ck.ck
  }

  async getPublicCK () {
    if (lodash.isEmpty(pubCk)) {
      logger.mark('请先配置公共查询ck')
      return false
    }

    /** 获取使用次数最少的ck */
    let list = await redis.zRangeByScore(MysInfo.key.count, 0, 27, true)

    if (lodash.isEmpty(list)) {
      logger.mark('公共查询ck已用完')
      return false
    }

    let ltuid = list[0]

    if (!pubCk[ltuid]) {
      logger.mark(`公共查询ck错误[ltuid:${ltuid}]`)
      await redis.zAdd(MysInfo.key.count, { score: 99, value: ltuid })
      return false
    }

    this.ckInfo.ck = pubCk[ltuid]
    this.ckInfo.ltuid = ltuid
    this.ckInfo.type = 'public'

    /** 非原子操作,可能存在误差 */

    /** 插入查询详情 */
    await redis.zAdd(MysInfo.key.detail, { score: ltuid, value: this.uid })
    /** 获取ck查询详情 */
    let count = await redis.zRangeByScore(MysInfo.key.detail, ltuid, ltuid)
    /** 统计ck查询次数 */
    redis.zAdd(MysInfo.key.count, { score: count.length, value: ltuid })
    /** 插入单个查询次数 */
    redis.setEx(`${MysInfo.key.ckNum}${ltuid}`, this.getEnd(), String(count.length))

    this.expire(MysInfo.key.detail)

    logger.mark(`[米游社查询][uid：${this.uid}]${logger.yellow(`[使用公共ck：${ltuid}][次数:${count.length}]`)}`)

    return pubCk[ltuid]
  }

  /** 初始化公共查询ck */
  async initPubCk () {
    /** 没配置每次都会初始化 */
    if (!lodash.isEmpty(pubCk)) return

    let ckList = await redis.zRangeByScore(MysInfo.key.count, 0, 100)

    await this.addPubCk(ckList)

    /** 使用用户ck当公共查询 */
    let set = GsCfg.getConfig('mys', 'set')
    let userNum = 0
    if (set.allowUseCookie == 1) {
      lodash.forEach(bingCkUid, async v => {
        if (pubCk[v.ltuid]) return
        pubCk[v.ltuid] = v.ck

        userNum++
        /** 加入redis统计 */
        if (!ckList.includes(v.ltuid)) {
          await redis.zAdd(MysInfo.key.count, { score: 0, value: String(v.ltuid) })
        }
      })
    }

    this.expire(MysInfo.key.count)

    if (userNum > 0) logger.mark(`加载用户ck：${userNum}个`)
  }

  /** 加入公共ck池 */
  async addPubCk (ckList = '') {
    let ckArr = GsCfg.getConfig('mys', 'pubCk')

    if (!ckList) {
      ckList = await redis.zRangeByScore(MysInfo.key.count, 0, 100)
    }

    let pubNum = 0
    for (let v of ckArr) {
      let [ltuid = ''] = v.match(/ltuid=(\w{0,9})/g)
      if (!ltuid) return

      ltuid = String(lodash.trim(ltuid, 'ltuid='))

      if (isNaN(ltuid)) return

      pubCk[ltuid] = v

      pubNum++

      /** 加入redis统计 */
      if (!ckList.includes(ltuid)) {
        await redis.zAdd(MysInfo.key.count, { score: 0, value: ltuid })
      }
    }
    if (pubNum > 0) logger.mark(`加载公共ck：${pubNum}个`)
  }

  async initBingCk () {
    if (!lodash.isEmpty(bingCkUid)) return

    let res = await GsCfg.getBingCk()
    bingCkUid = res.ck
    bingCkQQ = res.ckQQ
    bingCkLtuid = lodash.keyBy(bingCkUid, 'ltuid')
  }

  async checkCode (res, type) {
    res.retcode = Number(res.retcode)
    if (type == 'bbs_sign') {
      if ([-5003].includes(res.retcode)) {
        res.retcode = 0
      }
    }
    switch (res.retcode) {
      case 0:break
      case -1:
      case -100:
      case 1001:
      case 10001:
      case 10103:
        if (/(登录|login)/i.test(res.message)) {
          if (this.ckInfo.uid) {
            this.e.reply(`UID:${this.ckInfo.uid}，米游社cookie已失效，请重新绑定cookie`)
          } else {
            this.e.reply(`ltuid:${this.ckInfo.ltuid}，米游社cookie已失效`)
          }
          await this.delCk()
        } else {
          this.e.reply(`米游社接口报错，暂时无法查询：${res.message}`)
        }
        break
      case 1008:
        this.e.reply('\n请先去米游社绑定角色', false, { at: this.userId })
        break
      case 10101:
        this.disableToday()
        this.e.reply('查询已达今日上限')
        break
      case 10102:
        if (res.message == 'Data is not public for the user') {
          this.e.reply(`\nUID:${this.ckInfo.uid}，米游社数据未公开`, false, { at: this.userId })
        } else {
          this.e.reply(`uid:${this.uid}，请先去米游社绑定角色`)
        }
        break
      // 伙伴不存在~
      case -1002:
        if (res.api == 'detail') res.retcode = 0
        break
      default:
        this.e.reply(`米游社接口报错，暂时无法查询：${res.message || 'error'}`)
        break
    }

    if (res.retcode !== 0) {
      logger.mark(`mys接口报错:${JSON.stringify(res)}，uid：${this.uid}`)
    }

    return res
  }

  /** 删除失效ck */
  async delCk () {
    let ltuid = this.ckInfo.ltuid

    /** 记录公共ck失效 */
    if (this.ckInfo.type == 'public') {
      if (bingCkLtuid[ltuid]) {
        this.ckInfo = bingCkLtuid[ltuid]
        this.ckInfo.type = 'self'
      } else {
        logger.mark(`删除失效ck[ltuid:${ltuid}]`)
      }
    }

    if (this.ckInfo.type == 'self' || this.ckInfo.type == 'bing') {
      /** 获取用户绑定ck */
      let ck = GsCfg.getBingCkSingle(this.userId)
      let tmp = ck[this.ckInfo.uid]
      if (tmp) {
        ltuid = tmp.ltuid

        logger.mark(`删除失效绑定ck[qq:${this.userId}]`)
        /** 删除文件保存ck */
        delete ck[this.ckInfo.uid]
        GsCfg.saveBingCk(this.userId, ck)

        this.redisDel(ltuid)

        delete pubCk[ltuid]
        delete bingCkUid[tmp.uid]
        delete bingCkQQ[tmp.qq]
      }
    }

    delete pubCk[ltuid]

    await this.redisDel(ltuid)
  }

  async redisDel (ltuid) {
    /** 统计次数设为超限 */
    await redis.zRem(MysInfo.key.count, String(ltuid))
    // await redis.setEx(`${MysInfo.key.ckNum}${ltuid}`, this.getEnd(), '99')

    /** 将当前查询记录移入回收站 */
    await this.detailDel(ltuid)
  }

  /** 将当前查询记录移入回收站 */
  async detailDel (ltuid) {
    let detail = await redis.zRangeByScore(MysInfo.key.detail, ltuid, ltuid)
    if (!lodash.isEmpty(detail)) {
      let delDetail = []
      detail.forEach((v) => {
        delDetail.push({ score: ltuid, value: String(v) })
      })
      await redis.zAdd(MysInfo.key.delDetail, delDetail)
      this.expire(MysInfo.key.delDetail)
    }
    /** 删除当前ck查询记录 */
    await redis.zRemRangeByScore(MysInfo.key.detail, ltuid, ltuid)
  }

  async disableToday () {
    /** 统计次数设为超限 */
    await redis.zAdd(MysInfo.key.count, { score: 99, value: String(this.ckInfo.ltuid) })
    await redis.setEx(`${MysInfo.key.ckNum}${this.ckInfo.ltuid}`, this.getEnd(), '99')
  }

  async expire (key) {
    return await redis.expire(key, this.getEnd())
  }

  getEnd () {
    let end = moment().endOf('day').format('X')
    return end - moment().format('X')
  }

  /** 处理用户绑定ck */
  async addBingCk (ck) {
    /** 加入缓存 */
    bingCkUid[ck.uid] = ck
    bingCkQQ[ck.qq] = ck
    bingCkLtuid[ck.ltuid] = ck

    let set = GsCfg.getConfig('mys', 'set')

    /** qq-uid */
    await redis.setEx(`${MysInfo.key.qqUid}${ck.qq}`, 3600 * 24 * 30, String(ck.uid))

    /** 恢复回收站查询记录，会覆盖原来记录 */
    let detail = await redis.zRangeByScore(MysInfo.key.delDetail, ck.ltuid, ck.ltuid)
    if (!lodash.isEmpty(detail)) {
      let delDetail = []
      detail.forEach((v) => {
        delDetail.push({ score: ck.ltuid, value: String(v) })
      })
      await redis.zAdd(MysInfo.key.detail, delDetail)
      this.expire(MysInfo.key.detail)
    }
    /** 删除回收站记录 */
    await redis.zRemRangeByScore(MysInfo.key.delDetail, ck.ltuid, ck.ltuid)

    /** 获取ck查询详情 */
    let count = await redis.zRangeByScore(MysInfo.key.detail, ck.ltuid, ck.ltuid)

    /** 开启了用户ck查询 */
    if (set.allowUseCookie == 1) {
      pubCk[ck.ltuid] = ck
      let ckList = await redis.zRangeByScore(MysInfo.key.count, 0, 100)
      if (!ckList.includes(ck.ltuid)) {
        await redis.zAdd(MysInfo.key.count, { score: count.length, value: String(ck.ltuid) })
      }
    }
  }

  async delBingCk (ck) {
    delete bingCkUid[ck.uid]
    delete bingCkQQ[ck.qq]
    delete bingCkLtuid[ck.ltuid]

    this.detailDel(ck.ltuid)
  }

  async resetCk () {
    return await redis.del(MysInfo.key.count)
  }

  static async initCk () {
    if (lodash.isEmpty(bingCkUid)) {
      let mysInfo = new MysInfo()
      await mysInfo.initBingCk()
    }
  }

  static async getBingCkUid () {
    await MysInfo.initCk()

    return bingCkUid
  }

  /** 切换uid */
  static toggleUid (qq, ck) {
    bingCkQQ[qq] = ck
  }

  static async checkUidBing (uid) {
    await MysInfo.initCk()

    if (bingCkUid[uid]) return true

    return false
  }

  /** 数据更新中，请稍后再试 */
  checkTime () {
    let hour = moment().hour()
    let min = moment().minute()
    let second = moment().second()

    if (hour == 23 && min == 59 && second >= 58) {
      this.e.reply('数据更新中，请稍后再试')
      return false
    }
    if (hour == 0 && min == 0 && second <= 3) {
      this.e.reply('数据更新中，请稍后再试')
      return false
    }
    return true
  }
}
