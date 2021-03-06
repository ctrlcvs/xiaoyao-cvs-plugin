import MihoYoApi from "../model/mys/mihoyo-api.js"
import utils from '../model/mys/utils.js';
import promiseRetry from 'promise-retry';
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment';
import MysInfo from '../model/mys/mysInfo.js'
import {
	isV3
} from '../components/Changelog.js';
import gsCfg from '../model/gsCfg.js';
import fs from "fs";
export const rule = {
	mysSign: {
		reg: "^#*(米游社|mys|社区)(原神|崩坏3|崩坏2|未定事件簿|大别野|崩坏星穹铁道|绝区零|全部)签到$",
		describe: "米游社米游币签到（理论上会签到全部所以区分开了）"
	},
	sign: {
		reg: "^#*(崩坏3|崩坏2|未定事件簿)签到$",
		describe: "米社规则签到"
	},
	signlist: {
		reg: "^#(米游币|米社)全部签到$",
		describe: "米游币全部签到"
	},
	// allMysSign: {
	// 	reg: "^#米游币全部签到$",
	// 	describe: "米游币全部签到"
	// },
	// allSign: {
	// 	reg: "^#米社全部签到$",
	// 	describe: "米社全部签到"
	// },
	cookiesDocHelp: {
		reg: "^#*(米游社|cookies|米游币)帮助$",
		describe: "cookies获取帮助"
	}
};

const _path = process.cwd();
let START = moment().unix();
const TODAY_DATE = moment().format('YYYY-MM-DD');
const RETRY_OPTIONS = {
	retries: 3,
	minTimeout: 5000,
	maxTimeout: 10000
};
let YamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
export async function sign(e) {
	let {
		skuid,
		cookie
	} = await getCookie(e);
	if (!cookie) {
		e.reply("请先绑定cookie~\n发送【cookie帮助】获取教程")
		return true;
	}

	START = moment().unix();
	let miHoYoApi = new MihoYoApi(e);
	let resultMessage = "";
	let msg = e.msg.replace(/#|签到|井|米游社|mys|社区/g, "");
	let ForumData = await getDataList(msg);
	e.reply(`开始尝试${msg}签到预计${msg=='全部'?"60":"5-10"}秒~`)
	for (let forum of ForumData) {
		if (!(["崩坏3", "崩坏2", "未定事件簿"].includes(forum.name))) {
			continue;
		}
		resultMessage += `**${forum.name}**\n`
		try {
			// 1 BBS Sign
			let resObj = await promiseRetry((retry, number) => {
				// Bot.logger.info(`开始签到: [${forum.name}] 尝试次数: ${number}`);
				return miHoYoApi.honkai3rdSignTask(forum.name).catch((e) => {
					Bot.logger.error(`${forum.name} 签到失败: [${e.message}] 尝试次数: ${number}`);
					return retry(e);
				});
			}, RETRY_OPTIONS);
			Bot.logger.info(`${forum.name} 签到结果: [${resObj.message}]`);
			resultMessage += `签到: [${resObj.message}]\n`;
		} catch (e) {
			Bot.logger.error(`${forum.name} 签到失败 [${e.message}]`);
			resultMessage += `签到失败: [${e.message}]\n`;
		}

		await utils.randomSleepAsync();
	}
	await replyMsg(e, resultMessage);
	return true
}
export async function mysSign(e) {
	let isck = await cookie(e);
	if (!isck) {
		return true;
	}
	let iscount = "";
	let miHoYoApi = new MihoYoApi(e);
	if (Object.keys((await miHoYoApi.getStoken(e.user_id))).length == 0) {
		e.reply("未读取到stoken请检查cookies是否包含login_ticket、以及云崽是否为最新版本V3、V2兼容")
		return true;
	}

	START = moment().unix();
	let resultMessage = "";
	// Execute task
	let msg = e.msg.replace(/#|签到|井|米游社|mys|社区/g, "");
	let ForumData = await getDataList(msg);
	e.reply(`开始尝试${msg}社区签到预计${msg=='全部'?"10-20":"1-3"}分钟~`)
	for (let forum of ForumData) {
		resultMessage += `**${forum.name}**\n`
		try {
			// 1 BBS Sign
			let resObj = await promiseRetry((retry, number) => {
				// Bot.logger.info(`开始签到: [${forum.name}] 尝试次数: ${number}`);
				return miHoYoApi.forumSign(forum.forumId).catch((e) => {
					Bot.logger.error(`${forum.name} 签到失败: [${e.message}] 尝试次数: ${number}`);
					return retry(e);
				});
			}, RETRY_OPTIONS);
			Bot.logger.info(`${forum.name} 签到结果: [${resObj.message}]`);
			resultMessage += `签到: [${resObj.message}]\n`;
		} catch (e) {
			Bot.logger.error(`${forum.name} 签到失败 [${e.message}]`);
			resultMessage += `签到失败: [${e.message}]\n`;
		}
		await utils.randomSleepAsync();
	}
	for (let forum of ForumData) {
		resultMessage += `\n**${forum.name}**\n`
		try {
			// 2 BBS list post
			let resObj = await promiseRetry((retry, number) => {
				// Bot.logger.info(`读取帖子列表: [${forum.name}] 尝试次数: ${number}`);
				return miHoYoApi.forumPostList(forum.forumId).catch((e) => {
					Bot.logger.error(`${forum.name} 读取帖子列表失败: [${e.message}] 尝试次数: ${number}`);
					return retry(e);
				});
			}, RETRY_OPTIONS);
			Bot.logger.info(`${forum.name} 读取列表成功 [${resObj.message}]，读取到 [${resObj.data.list.length}] 条记录`);

			let postList = resObj.data.list;
			for (let post of postList) {
				post = post.post;
				// 2.1 BBS read post
				let resObj = await promiseRetry((retry, number) => {
					// Bot.logger.info(`读取帖子: [${post.subject}] 尝试次数: ${number}`);
					return miHoYoApi.forumPostDetail(post['post_id']).catch((e) => {
						Bot.logger.error(`${forum.name} 读取帖子失败: [${e.message}] 尝试次数: ${number}`);
						return retry(e);
					});
				}, RETRY_OPTIONS);
				// Bot.logger.info(`${forum.name} [${post.subject}] 读取成功 [${resObj.message}]`);
				await utils.randomSleepAsync();
				// 2.2 BBS vote post
				resObj = await promiseRetry((retry, number) => {
					// Bot.logger.info(`点赞帖子: [${post.subject}] 尝试次数: ${number}`);
					return miHoYoApi.forumPostVote(post['post_id']).catch((e) => {
						Bot.logger.error(`${forum.name} 点赞帖子失败: [${e.message}] 尝试次数: ${number}`);
						return retry(e);
					});
				}, RETRY_OPTIONS);

				// Bot.logger.info(`${forum.name} [${post.subject}] 点赞成功 [${resObj.message}]`);
				await utils.randomSleepAsync();
			}

			// 2.3 BBS share post
			let sharePost = postList[0].post;
			resObj = await promiseRetry((retry, number) => {
				// Bot.logger.info(`分享帖子: [${sharePost.subject}] 尝试次数: ${number}`);
				return miHoYoApi.forumPostShare(sharePost['post_id']).catch((e) => {
					Bot.logger.error(`${forum.name} 分享帖子失败: [${e.message}] 尝试次数: ${number}`);
					return retry(e);
				});
			}, RETRY_OPTIONS);
		} catch (e) {
			Bot.logger.error(`${forum.name} 读帖点赞分享失败 [${e.message}]`);
			resultMessage += `读帖点赞分享: 失败 [${e.message}]\n`;
		}
		resultMessage += `读帖点赞分享: 成功\n`;
		await utils.randomSleepAsync();
	}
	await replyMsg(e, resultMessage);
	return true
}

async function replyMsg(e, resultMessage) {
	const END = moment().unix();
	Bot.logger.info(`运行结束, 用时 ${END - START} 秒`);
	resultMessage += `\n用时 ${END - START} 秒`;
	e.reply(resultMessage);
}

async function getDataList(name) {
	let ForumData = Data.readJSON(`${_path}/plugins/xiaoyao-cvs-plugin/defSet/json`, "mys")
	for (let item of ForumData) {
		if (item.name == name) { //循环结束未找到的时候返回原数组签到全部
			return [item]
		}
	}
	return ForumData;
}

async function cookie(e) {
	let {
		cookie,
		uid
	} = await getCookie(e);
	let miHoYoApi = new MihoYoApi(e);
	let skuid;
	let cookiesDoc = await getcookiesDoc();

	if (!cookie) {
		e.reply("cookie失效请重新绑定~【教程】\n" + cookiesDoc)
		return false;
	}

	if (Object.keys((await miHoYoApi.getStoken(e.user_id))).length != 0) {
		return true;
	}
	if (!cookie.includes("login_ticket") && (isV3 && !skuid?.login_ticket)) {
		e.reply("米游社登录cookie不完整，请前往米游社通行证处重新获取cookie~\ncookies必须包含login_ticket【教程】 " + cookiesDoc)
		return false;
	}
	let flot = (await miHoYoApi.stoken(cookie, e));
	// console.log(flot)
	await utils.sleepAsync(1000); //延迟加载防止文件未生成
	if (!flot) {
		e.reply("登录失效请重新登录获取cookie发送机器人~")
		return false;
	}
	return true;
}
async function getCookie(e) {
	let skuid, cookie, uid
	if (isV3) {
		skuid = await gsCfg.getBingCookie(e.user_id);
		cookie = skuid.ck;
		uid = skuid.item;
	} else {
		if (NoteCookie[e.user_id]) {
			cookie = NoteCookie[e.user_id].cookie;
			uid = NoteCookie[e.user_id].uid;
			skuid = NoteCookie[e.user_id];
		} else if (BotConfig.dailyNote && BotConfig.dailyNote[e.user_id]) {
			cookie = BotConfig.dailyNote[e.user_id].cookie;
			uid = BotConfig.dailyNote[e.user_id].uid;
			skuid = BotConfig.NoteCookie[e.user_id];
		}
	}
	e.uid = uid;
	e.cookie = cookie;
	return {
		cookie,
		uid,
		skuid
	}
}
export async function cookiesDocHelp(e) {
	let cookiesDoc = await getcookiesDoc()
	e.reply("【cookies帮助】" + cookiesDoc + "\ncookies必须包含login_ticket获取后请私发机器人");
	return true
}
async function getcookiesDoc() {
	return await gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config").cookiesDoc
}
//定时米社米币签到任务
export async function allMysSign() {
	Bot.logger.mark(`开始米社米币签到任务`);
	let stoken = await gsCfg.getBingStoken();
	let isPushSign = await gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config").isPushSign
	//获取需要签到的用户
	for (let data of stoken) {
		let user_id = data.qq;
		Bot.logger.mark(`正在为qq${user_id}签到`);
		let e = {
			user_id,
			isTask: true
		};
		e.cookie = `stuid=${data.stuid};stoken=${data.stoken};ltoken=${data.ltoken};`;
		e.msg = "全部"
		//已签到不重复执行
		let key = `genshin:mys:signed_bbs:${user_id}`;
		if (await redis.get(key)) {
			continue;
		}

		e.reply = (msg) => {
			//关闭签到消息推送
			if (!isPushSign) {
				return;
			}
			if (msg.includes("签到成功") && (cookie.isSignPush === true || cookie.isSignPush === undefined)) {
				// msg = msg.replace("签到成功", "自动签到成功");
				utils.relpyPrivate(user_id, msg + "\n自动签到成功");
			}
		};

		await mysSign(e);
		await utils.sleepAsync(10000);
	}
	Bot.logger.mark(`签到任务完成`);
	return true
}

//定时签到任务
export async function allSign() {
	Bot.logger.mark(`开始米社签到任务`);
	let isAllSign = await gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config").isAllSign
	let userIdList = [];
	if (isV3) {
		let dir = './data/MysCookie/'
		let files = fs.readdirSync(dir).filter(file => file.endsWith('.yaml'))
		userIdList = (files.join(",").replace(/.yaml/g, "").split(","))
	} else {
		for (let [user_id, cookie] of Object.entries(NoteCookie)) {
			userIdList.push(user_id)
		}
	}
	for (let qq of userIdList) {
		let user_id = qq;
		let e = {
			user_id,
			qq,
			isTask: true
		};
		e.msg = "全部"
		e.reply = (msg) => {
			if (!msg.includes("OK")) {
				return;
			}
			if (!isAllSign) {
				return;
			}
			if (msg.includes("签到成功") && (cookie.isSignPush === true || cookie.isSignPush === undefined)) {
				utils.relpyPrivate(qq, msg + "\n自动签到成功");
			}
		};
		await sign(e);
		await utils.sleepAsync(10000);
	}
	Bot.logger.mark(`签到任务完成`);
}
const checkAuth = async function(e) {
	return await e.checkAuth({
		auth: "master",
		replyMsg: `只有主人才能命令我哦~
    (*/ω＼*)`
	});
}
let isbool = false;
let ismysbool = false;
export async function signlist(e) {
	if (!await checkAuth(e)) {
		return true;
	}
	if (isbool) {
		e.reply(`米社签到中请勿重复执行`)
		return true;
	}
	if (ismysbool) {
		e.reply(`米游币签到中请勿重复执行`)
		return true;
	}
	let msg = e.msg.replace(/#|全部签到/g, "")
	e.reply(`开始执行${msg}签到中，请勿重复执行`);
	if (msg == "米游币") {
		if(!fs.existsSync(YamlDataUrl)){
			Data.createDir("", YamlDataUrl, false);
			e.reply("未读取到可签到文件")
			return true;
		}
		ismysbool=true;
		await allMysSign()
	} else {
		isbool = true;
		await allSign()
	}
	e.reply(`${msg}签到任务已完成`);
	ismysbool=false;
	isbool = false;
	return true;
}
