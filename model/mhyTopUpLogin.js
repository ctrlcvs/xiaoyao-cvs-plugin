import User from "./user.js";
import utils from './mys/utils.js';
import { segment } from 'oicq'
import Common from "../components/Common.js";
export default class mysTopLogin {
    constructor(e) {
        this.e = e;
        this.init();
        //消息提示以及风险警告
        this.sendMsgUser = `免责声明:您将通过扫码完成获取米游社sk以及ck。\n本Bot将不会保存您的登录状态。\n我方仅提供米游社查询及相关游戏内容服务,若您的账号封禁、被盗等处罚与我方无关。\n害怕风险请勿扫码~`
        this.sendMsgUserPassLogin = `免责声明:您将通过密码完成获取米游社sk以及ck。\n本Bot将不会保存您的账号和密码。\n我方仅提供米游社查询及相关游戏内容服务,若您的账号封禁、被盗等处罚与我方无关。\n害怕风险请勿发送账号密码~`
    }
    async init() {
        this.user = new User(this.e)
    }
    //
    async qrCodeLogin() {
        let RedisData = await utils.redisGet(this.e.user_id, "GetQrCode")
        if (RedisData) {
            this.e.reply([segment.at(this.e.user_id), `前置二维码未扫描，请勿重复触发指令`])
            return false;
        }
        this.device = await utils.randomString(64)
        this.e.reply(this.sendMsgUser)
        let res = await this.user.getData("qrCodeLogin", {
            device: this.device
        })
        if (!res.data) {
            return false;
        }
        res.data["ticket"] = res?.data?.url.split("ticket=")[1]
        return res
    }
    async GetQrCode(ticket) {
        await utils.redisSet(this.e.user_id, "GetQrCode", { GetQrCode: 1 }, 60 * 5) //设置5分钟缓存避免重复触发
        let res;
        let RedisData = await utils.redisGet(this.e.user_id, "GetQrCode")
        for (let n = 1; n < 60; n++) {
            await utils.sleepAsync(5000)
            res = await this.user.getData("qrCodeQuery", {
                device: this.device, ticket
            })
            if (res?.data?.stat == "Scanned" && RedisData.GetQrCode == 1) {
                Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
                await this.e.reply("二维码已扫描，请确认登录", true)
                RedisData.GetQrCode++;
            }
            if (res?.data?.stat == "Confirmed") {
                Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
                break
            }
        }
        await utils.redisDel(this.e.user_id, 'GetQrCode')
        if (!res?.data?.payload?.raw) {
            await this.e.reply("验证超时", true)
            return false
        }
        let raw = JSON.parse(res?.data?.payload?.raw)
        let UserData = await this.user.getData("getTokenByGameToken", raw)
        let ck = await this.user.getData("getCookieAccountInfoByGameToken", raw)
        return {
            cookie: `ltoken=${UserData.data?.token?.token};ltuid=${UserData.data?.user_info?.aid};cookie_token=${ck.data?.cookie_token}`,
            stoken: `stoken=${UserData.data?.token?.token};stuid=${UserData.data?.user_info?.aid};mid=${UserData?.data?.user_info.mid}`
        }
    }

    async UserPassMsg() {
        this.e.reply(this.sendMsgUserPassLogin)
        this.e.reply(`请将账号密码用逗号隔开私聊发送以完成绑定\n例：账号xxx@qq.com,密码xxxxx`)
    }
    async UserPassLogin() {
        let msg = this.e.msg.replace(/账号|密码|：|:/g, '').replace(/,|，/, ',').split(',');
        if (msg.length != 2) {
            return false;
        }
        let body = {
            account: msg[0], password: msg[1],
        }
        let res = await this.user.getData("loginByPassword", body, "")
        Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
        if (res.retcode == -3101) {
            Bot.logger.mark("[米哈游登录] 正在验证")
            this.aigis_captcha_data = JSON.parse(res.aigis_data.data)
            let vlData = await this.crack_geetest()
            // let validate = await this.user.getData("validate", this.aigis_captcha_data, false)
            if (vlData?.data?.geetest_seccode) {
                Bot.logger.mark("[米哈游登录] 验证成功")
            } else {
                Bot.logger.error("[米哈游登录] 验证失败")
                this.e.reply('接口效验失败，请重新尝试~')
                return false
            }
            let validate = vlData?.data?.geetest_seccode.replace("|jordan", '')
            let aigis = res.aigis_data.session_id + ";" + Buffer.from(JSON.stringify({
                geetest_challenge: vlData?.data?.geetest_challenge,
                geetest_seccode: validate + "|jordan",
                geetest_validate: validate
            })).toString("base64")
            body.headers = {
                'x-rpc-aigis': aigis,
            }
            res = await this.user.getData("loginByPassword", body, false)
            Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
        }
        if (res.retcode == 0) {
            let cookies = `stoken=${res.data.token.token}&mid=${res.data.user_info.mid}`
            let cookie_token = await this.user.getData("bbsGetCookie", { cookies })
            let ltoken = await this.user.getData('getLtoken', { cookies: `${cookies}` }, false)
            Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(cookie_token))}`)
            return {
                cookie: `ltoken=${ltoken?.data?.ltoken};ltuid=${res.data.user_info.aid};cookie_token=${cookie_token?.data?.cookie_token};`,
                stoken: `${cookies.replace('&', ';')};stuid=${res.data.user_info.aid};`
            }
        } else {
            await this.e.reply(`错误：${JSON.stringify(res)}`, true)
            return false
        }
    }
    async crack_geetest() {
        let res = ""; //await this.user.getData("microgg", this.aigis_captcha_data, false)
        Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
        await this.e.reply(`请完成验证：https://challenge.minigg.cn/manual/index.html?gt=${this.aigis_captcha_data.gt}&challenge=${this.aigis_captcha_data.challenge}`, true)
        for (let n = 1; n < 60; n++) {
            await utils.sleepAsync(5000)
            try {
                res = await this.user.getData("microggVl", this.aigis_captcha_data, false)
                if (res?.data?.geetest_seccode) {
                    return res
                }
            } catch (err) {
                Bot.logger.error(`[米哈游登录] 错误：${Bot.logger.red(err)}`)
            }
        }
        await this.e.reply("验证超时", true)
        return false;
    }

    async showgoods() {
        let goodslist = await this.goodsList()
        if (!goodslist) return false;
        let msg = ['当前支持的商品有：\n']
        for (const [i, goods] of Object.entries(goodslist)) {
            if (i == 'api') continue;
            let num = `${goods['goods_name']}×${(goods['goods_unit'])}` + ((goods['goods_unit']) > 0 ? goods["goods_name"] : '')
            // console.log(`ID：${i}  ${num}  价格：${parseInt(goods['price']) / 100}元`)
            msg.push(`ID：${i}  ${num}  价格：${parseInt(goods['price']) / 100}元\n`)
        }
        this.e.reply(msg)
        return true;
    }

    async GetCode({ render }) {
        try {
            let msg = this.e.msg.replace(/,|，|\|/g, ' ').split(' ')
            if (msg.length != 2) {
                this.e.reply(`格式参考：#原神充值 6(商品ID)\n 可通过【#商品列表】获取可操作商品`)
                return true;
            }
            let iswx = msg[0].includes('微信') ? 'weixin' : 'alipay'
            if (msg[1].length != 1) {
                his.e.reply(`格式参考：#原神充值 6(商品ID)\n 可通过【#商品列表】获取可操作商品`)
                return true;
            }
            let goods = (await this.goodsList())[msg[1]]
            if (!this.e.cookie) {
                this.e.reply('请先 #绑定cookie')
                return true;
            }
            let ckData =await utils.getCookieMap(this.e.cookie)
            let device_id = utils.randomString(4)
            let order = {
                "account":ckData?.get('ltuid')||ckData.get('account_id'),
                "region": utils.getServer(this.e.uid),
                "uid": this.e.uid,
                "delivery_url": "",
                "device": device_id,
                "channel_id": 1,
                "client_ip": "",
                "client_type": 4,
                "game": this.e.uid[0] * 1 > 5 ? 'hk4e_global' : "hk4e_cn",
                "amount": goods.price,
                "goods_num": 1,
                "goods_id": goods?.goods_id,
                "goods_title": goods?.goods_name + (Number(goods.goods_unit) > 0 ? "×" + goods.goods_unit : ""),
                "price_tier": goods?.tier_id,
                "currency": "CNY",
                "pay_plat": iswx,
            }
            if (iswx != 'weixin') {
                order["pay_type"] = iswx
                order["pay_vendor"] = iswx
            }
            let res = await this.user.getData('createOrder', { order, headers: { "x-rpc-device_id": device_id } })
            if (!res) return false;
            if (res?.code != 200 && res?.retcode != 0) {
                this.e.reply('生成充值订单失败：' + res.message)
                return true
            }
            //记录操作日志
            logger.mark(`当前操作用户：${this.e.user_id},操作uid:${this.e.uid},操作商品id:${goods?.goods_id},操作商品：${goods?.goods_name + (Number(goods.goods_unit) > 0 ? "×" + goods.goods_unit : "")}`)
            logger.mark(`支付链接：${res['data']['encode_order']}\n订单号：${res['data']['order_no']}\n 价格：${(res['data']['amount']) / 100}元`)
            let r = await Common.render(`pay/index`, {
                url: res.data.encode_order,
                data: res.data, uid: this.e.uid,
                goods,
            }, {
                e: this.e,
                render,
                scale: 1.2, retMsgId: true
            })
            return true
        } catch (error) {
            console.log(error)
            this.e.reply('出问题了捏')
        }
        return true;
    }

    async goodsList() {
        let goods = await this.user.getData("goodsList")
        if (goods?.retcode != 0) {
            this.e.reply(goods.message)
            return false;
        }
        return goods?.data?.goods_list;
    }
    async checkOrder() {
        let msg, uid, order_no
        if (!this.e.source) {
            msg = this.e.msg.match(/\d{9,}/g)
            uid = msg[0], order_no = msg[1]
        } else {
            msg = this.e.source.message.match(/\d{9,}/g)
            uid = msg[0], order_no = msg[1]
        }
        let res = await this.user.getData('checkOrder', {
            uid, order_no
        }, false)
        if (!res) return false;
        if (res?.data?.status == 1) {
            this.e.reply(`uid:${uid},订单：${order_no}等待支付中`)
        } else if (res?.data?.status == 999) {
            this.e.reply(`uid:${uid},订单：${order_no}已支付完成`)
        } else {
            this.e.reply(`订单：${order_no},${res.message}`)
        }
        return true
    }
}