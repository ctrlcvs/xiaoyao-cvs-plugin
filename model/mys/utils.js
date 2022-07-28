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
	
export default {
	sleepAsync,
	randomSleepAsync,
	randomString
}
