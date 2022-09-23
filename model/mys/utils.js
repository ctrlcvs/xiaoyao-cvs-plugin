import _ from 'lodash';

export async function sleepAsync(sleepms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, sleepms)
	});
}


export async function randomSleepAsync() {
	let sleep = 3 * 1000 + _.random(5 * 1000);
	await sleepAsync(sleep);
}

export function randomString(length) {
	let randomStr = '';
	for (let i = 0; i < length; i++) {
		randomStr += _.sample('abcdefghijklmnopqrstuvwxyz0123456789');
	}
	return randomStr;
}
/**
 * 发送私聊消息，仅给好友发送
 * @param user_id qq号
 * @param msg 消息
 */
export async function relpyPrivate(userId, msg) {
	userId = Number(userId)
	let friend = Bot.fl.get(userId)
	if (friend) {
		Bot.logger.mark(`发送好友消息[${friend.nickname}](${userId})`)
		return await Bot.pickUser(userId).sendMsg(msg).catch((err) => {
			Bot.logger.mark(err)
		})
	}
}
export async function replyMake(e, _msg, lenght) {
	let nickname = Bot.nickname;
	if (e.isGroup) {
		let info = await Bot.getGroupMemberInfo(e.group_id, Bot.uin)
		nickname = info.card || info.nickname
	}
	let msgList = [];
	for (let [index, item] of Object.entries(_msg)) {
		if (index < lenght) {
			continue;
		}
		msgList.push({
			message: item,
			nickname: nickname,
			user_id: Bot.uin
		})
	}
	if(e._reply){
		e._reply(await Bot.makeForwardMsg(msgList));
	}else {
		e.reply(await Bot.makeForwardMsg(msgList));
	}
}
export async function getCookieMap(cookie) {
	let cookiePattern = /^(\S+)=(\S+)$/;
	let cookieArray = cookie.replace(/\s*/g, "").split(";");
	let cookieMap = new Map();
	for (let item of cookieArray) {
		let entry = item.split("=");
		if (!entry[0]) continue;
		cookieMap.set(entry[0], entry[1]);
	}
	return cookieMap||{};
}
export default {
	sleepAsync,
	randomSleepAsync,
	replyMake,
	randomString,
	relpyPrivate,
	getCookieMap
}
