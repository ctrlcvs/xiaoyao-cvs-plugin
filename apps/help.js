import { segment } from "oicq";

const _path = process.cwd();
export async function calendar(e) {
	e.reply("当前版本支持：\n角色、武器、食谱、怪物、圣遗物\n指令例：魔女图鉴")
	return true;
}

export async function versionInfo(e) {
	e.reply("当前图鉴版本：1.0.1")
	return true;
}