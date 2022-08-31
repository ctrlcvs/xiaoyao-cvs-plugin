import _ from 'lodash';

export async function sleepAsync(sleepms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, sleepms)
	});
}


export async function randomSleepAsync(){
	let sleep = 2 * 1000 + _.random(3 * 1000);
	await sleepAsync(sleep);
}

export function randomString(length){
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
export async function relpyPrivate (userId, msg) {
	  userId = Number(userId)
	  let friend = Bot.fl.get(userId)
	  if (friend) {
	    Bot.logger.mark(`发送好友消息[${friend.nickname}](${userId})`)
	    return await Bot.pickUser(userId).sendMsg(msg).catch((err) => {
	      Bot.logger.mark(err)
	    })
	  }
}
export default {
	sleepAsync,
	randomSleepAsync,
	randomString,relpyPrivate
}
