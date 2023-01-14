import User from "./user.js";
import fs from "fs";
import {
    isV3
} from '../components/Changelog.js'
import utils from './mys/utils.js';
import gsCfg from './gsCfg.js';
import {segment} from 'oicq'
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
        let res;
        for (let n = 1; n < 60; n++) {
            await utils.sleepAsync(5000)
            res = await this.user.getData("qrCodeQuery", {
                device: this.device, ticket
            })
            if (res?.data?.stat == "Scanned") {
                Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
                await this.e.reply("二维码已扫描，请确认登录", true)
            }
            if (res?.data?.stat == "Confirmed") {
                Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
                break
            }
        }
        if (!res) {
            await this.e.reply("验证超时", true)
            return false
        }
        let raw = JSON.parse(res?.data?.payload?.raw)
        let UserData = await this.user.getData("getTokenByGameToken", raw)
        let ck = await this.user.getData("getCookieAccountInfoByGameToken", raw)
        return {
            cookie: `ltoken=${UserData.data.token.token};ltuid=${UserData.data.user_info.aid};cookie_token=${ck.data.cookie_token}`,
            stoken: `stoken=${UserData.data.token.token};stuid=${UserData.data.user_info.aid};mid=${UserData.data.user_info.mid}`
        }
    }

    async UserPassMsg() {
        this.e.reply(this.sendMsgUserPassLogin)
        this.e.reply(`请将账号密码用逗号隔开发送以完成绑定\n例：账号xxx@qq.com,密码xxxxx`)
    }
    async UserPassLogin() {
        let msg = this.e.msg.replace(/账号|密码|：|:/g,'').replace(/,|，/, ',').split(',');
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
            // let validate = await this.crack_geetest()
            let validate = await this.user.getData("validate",this.aigis_captcha_data,false)
            if (validate?.data?.validate) {
                Bot.logger.mark("[米哈游登录] 验证成功")
            } else {
                Bot.logger.error("[米哈游登录] 验证失败")
                this.e.reply('接口效验失败，请重新尝试~')
                return false
            }
            let  aigis= res.aigis_data.session_id + ";" + Buffer.from(JSON.stringify({
                geetest_challenge: validate?.data?.challenge,
                geetest_seccode: validate?.data?.validate + "|jordan",
                geetest_validate: validate?.data?.validate
            })).toString("base64")
            body.headers={
                'x-rpc-aigis':aigis,
            }
            res = await this.user.getData("loginByPassword",body,false)
            Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
        }
        if (res.retcode == 0) {
            let cookies=`stoken=${res.data.token.token}&mid=${res.data.user_info.mid}`
            let cookie_token =this.user.getData("bbsGetCookie",{cookies})
            let ltoken = await this.user.getData('getLtoken', { cookies: `${cookies};stuid=${res.data.user_info.aid};` }, false)
            Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(cookie_token))}`)
            return {
                cookie:`ltoken=${ltoken?.data?.ltoken};ltuid=${res.data.user_info.aid};cookie_token=${cookie_token?.data?.cookie_token};`,
                stoken:`${cookies};stuid=${res.data.user_info.aid};`
            }
        } else {
            await this.e.reply(`错误：${JSON.stringify(res)}`, true)
            return false
        }
    }
    async crack_geetest() {
        let res =await this.user.getData("microgg", this.aigis_captcha_data, false)
        Bot.logger.mark(`[米哈游登录] ${Bot.logger.blue(JSON.stringify(res))}`)
        await this.e.reply(`请完成验证：${res.shorturl}`, true)
        for (let n = 1; n < 60; n++) {
            await utils.sleepAsync(5000)
            try {
                res =await this.user.getData("microggVl", this.aigis_captcha_data, false)
                if (res.geetest_validate) {
                    return res
                }
            } catch (err) {
                Bot.logger.error(`[米哈游登录] 错误：${Bot.logger.red(err)}`)
            }
        }
        await this.e.reply("验证超时", true)
        return false;
    }

    async showgoods(){
        let goodslist = await this.goodsList()
        if(!goodslist) return false;
        let msg = ['当前支持的商品有：\n']
        for (const [i, goods] of Object.entries(goodslist)) {
            if(i=='api') continue;
            let num = `${goods['goods_name']}×${(goods['goods_unit'])}` + ((goods['goods_unit']) > 0 ? goods["goods_name"] : '')
            // console.log(`ID：${i}  ${num}  价格：${parseInt(goods['price']) / 100}元`)
            msg.push(`ID：${i}  ${num}  价格：${parseInt(goods['price']) / 100}元\n`)
        }
        this.e.reply(msg)
        return true;
    }

    async GetCode(){
        try {
            let msg = this.e.msg.replace(/,|，|\|/g, ' ').split(' ')
            if (msg.length != 3) {
                this.e.reply(`格式参考：#原神充值 6(商品ID) 120065390(uid)\n 可通过【#商品列表】获取可操作商品`)
                return true;
            }
            let iswx = msg[0].includes('微信') ? 'weixin' : 'alipay'
            if (msg[2].length != 9) {
                this.e.reply('uid格式不对!')
                return true;
            }
            let res =await this.user.getData('GetCode',{msg:this.e.msg.replace('#','')})
            if(!res) return false;
            if(res?.code!=200&&res?.retcode!=0){
                return true
            }
            this.e.reply([`uid:${res.data.uid},请使用${iswx=='weixin'?'微信':"支付宝"}扫码支付：`,segment.image(res.data.base64.replace("data:image/png;base64,", "base64://")),`\n订单号：${res['data']['order_no']}\n 价格：${(res['data']['amount'])/100}元`])
        } catch (error) {
            this.e.reply('出问题了捏')
        }
        return true;
    }

    async goodsList() {
        let goods =await this.user.getData("goodsList")
        if(!goods) return false;
        return goods;
    }
    async checkOrder(){
        let msg,uid,order_no
        if(!this.e.source){
            msg=this.e.msg.match(/\d{9,}/g)
            uid=msg[0],order_no=msg[1]
        }else{
            msg=this.e.source.message.match(/\d{9,}/g)
            uid=msg[0],order_no=msg[1]
        }
        let res=await this.user.getData('checkOrder',{
            uid,order_no
        },false)
        if(!res) return false;
        if(res?.data?.status==1){
            this.e.reply(`uid:${uid},订单：${order_no}等待支付中`)
        }else if(res?.data?.status==999){
            this.e.reply(`uid:${uid},订单：${order_no}已支付完成`)
        }else{
            this.e.reply(`订单：${order_no},${res.message}`)
        }
        return true
    }
}