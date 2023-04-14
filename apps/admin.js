import fs from "fs";
import lodash from "lodash";
import {
	createRequire
} from "module";
import {
	exec
} from "child_process";
import {
	Cfg
} from "../components/index.js";
import Common from "../components/Common.js";

let cfgMap = {
	"体力": "sys.Note",
	"帮助": "sys.help",
	"匹配": "sys.Atlas",
	"戳一戳":"note.poke",
	"模板": "mb.len",
	"获取sk":"ck.sk",
	"目录":"Atlas.all",
	"扫码绑定":'mhy.qrcode',
};
let sysCfgReg = `^#图鉴设置\s*(${lodash.keys(cfgMap).join("|")})?\s*(.*)$`;
export const rule = {
	updateRes: {
		hashMark: true,
		reg: "^#图鉴(强制)?更新$",
		describe: "【#管理】更新素材",
	},
	updateMiaoPlugin: {
		hashMark: true,
		reg: "^#图鉴插件(强制)?更新",
		describe: "【#管理】图鉴更新",
	},
	updateTemp:{
		hashMark: true,
		reg: "^#图鉴模板(强制)?更新$",
		describe: "【#管理】更新素材",
	},
	sysCfg: {
		hashMark: true,
		reg: sysCfgReg,
		describe: "【#管理】系统设置"
	}
};


const _path = process.cwd();
const resPath = `${_path}/plugins/xiaoyao-cvs-plugin/resources/`;
const plusPath = `${resPath}/xiaoyao-plus/`;
const notePlus=`${resPath}/BJT-Templet/`;
export async function sysCfg(e, {
	render
}) {
	if (!await checkAuth(e)) {
		return true;
	}

	let cfgReg = new RegExp(sysCfgReg);
	let regRet = cfgReg.exec(e.msg);

	if (!regRet) {
		return true;
	}

	if (regRet[1]) {

		// 设置模式
		let val = regRet[2] || "";
		
		let cfgKey = cfgMap[regRet[1]];

		if (cfgKey === "sys.scale") {
			val = Math.min(200, Math.max(50, val * 1 || 100));
		}else if(cfgKey === "mb.len"){
			val= Math.min(2,Math.max(val,0));
		}else if(cfgKey==='mhy.qrcode'){
			val= Math.min(3,Math.max(val,0));
		} else {
			val = !/关闭/.test(val);
		}
		if (cfgKey) {
			Cfg.set(cfgKey, val);
		}
	}
	let cfg = {
		help: getStatus("sys.help", false),
		Note: getStatus("sys.Note",false),
		Atlas: getStatus("sys.Atlas",false),
		len:Cfg.get("mb.len", 0),
		poke: getStatus("note.poke",false),
		isSk: getStatus("ck.sk",false),
		qrcode:Cfg.get("mhy.qrcode", 0),
		imgPlus: fs.existsSync(plusPath),
		notePlus: fs.existsSync(notePlus),
		bg: await rodom(), //获取底图
		Atlasall:getStatus("Atlas.all",false),
	}
	//渲染图像
	return await Common.render("admin/index", {
		...cfg,
	}, {
		e,
		render,
		scale: 1.4
	});
}

const rodom = async function() {
	var image = fs.readdirSync(`./plugins/xiaoyao-cvs-plugin/resources/admin/imgs/bg`);
	var list_img = [];
	for (let val of image) {
		list_img.push(val)
	}
	var imgs = list_img.length == 1 ? list_img[0] : list_img[lodash.random(0, list_img.length - 1)];
	return imgs;
}

const checkAuth = async function(e) {
	return await e.checkAuth({
		auth: "master",
		replyMsg: `只有主人才能命令我哦~
    (*/ω＼*)`
	});
}
const getStatus = function(rote, def = true) {
	if (Cfg.get(rote, def)) {
		return `<div class="cfg-status" >已开启</div>`;
	} else {
		return `<div class="cfg-status status-off">已关闭</div>`;
	}

}

export async function updateRes(e) {
	if (!await checkAuth(e)) {
		return true;
	}
	let command = "";
	if (fs.existsSync(`${resPath}/xiaoyao-plus/`)) {
		e.reply("开始尝试更新，请耐心等待~");
		command = `git pull`;
		let isForce = e.msg.includes("强制");
		if (isForce) {
			command = "git  checkout . && git  pull";
			// command="git fetch --all && git reset --hard origin/master && git pull "
			e.reply("正在执行强制更新操作，请稍等");
		} else {
			e.reply("正在执行更新操作，请稍等");
		}
		exec(command, {
			cwd: `${resPath}/xiaoyao-plus/`
		}, function(error, stdout, stderr) {
			//console.log(stdout);
			if (/Already up to date/.test(stdout)||stdout.includes("最新")) {
				e.reply("目前所有图片都已经是最新了~");
				return true;
			}
			let numRet = /(\d*) files changed,/.exec(stdout);
			if (numRet && numRet[1]) {
				e.reply(`报告主人，更新成功，此次更新了${numRet[1]}个图片~`);
				return true;
			}
			if (error) {
				e.reply("更新失败！\nError code: " + error.code + "\n" + error.stack + "\n 请稍后重试。");
			} else {
				e.reply("图片加量包更新成功~");
			}
		});
	} else {
		//gitee图床
		command = `git clone https://gitee.com/Ctrlcvs/xiaoyao-plus.git "${resPath}/xiaoyao-plus/"`
		// command = `git clone https://github.com/ctrlcvs/xiaoyao_plus.git "${resPath}/xiaoyao-plus/"`;\n此链接为github图床,如异常请请求多次
		e.reply("开始尝试安装图鉴加量包，可能会需要一段时间，请耐心等待~");
		exec(command, function(error, stdout, stderr) {
			if (error) {
				e.reply("角色图片加量包安装失败！\nError code: " + error.code + "\n" + error.stack + "\n 请稍后重试。");
			} else {
				e.reply("角色图片加量包安装成功！您后续也可以通过 #图鉴更新 命令来更新图像");
			}
		});
	}
	return true;
}

let timer;

export async function updateMiaoPlugin(e) {
	if (!await checkAuth(e)) {
		return true;
	}
	let isForce = e.msg.includes("强制");
	let command = "git  pull";
	if (isForce) {
		command = "git  checkout . && git  pull";
		e.reply("正在执行强制更新操作，请稍等");
	} else {
		e.reply("正在执行更新操作，请稍等");
	}
	exec(command, {
		cwd: `${_path}/plugins/xiaoyao-cvs-plugin/`
	}, function(error, stdout, stderr) {
		//console.log(stdout);
		if (/Already up[ -]to[ -]date/.test(stdout)||stdout.includes("最新")) {
			e.reply("目前已经是最新版图鉴插件了~");
			return true;
		}
		if (error) {
			e.reply("图鉴插件更新失败！\nError code: " + error.code + "\n" + error.stack + "\n 请稍后重试。");
			return true;
		}
		e.reply("图鉴插件更新成功，尝试重新启动Yunzai以应用更新...");
		timer && clearTimeout(timer);
		redis.set("xiaoyao:restart-msg", JSON.stringify({
			msg: "重启成功，新版图鉴插件已经生效",
			qq: e.user_id
		}), {
			EX: 30
		});
		timer = setTimeout(function() {
			let command = `npm run start`;
			if (process.argv[1].includes("pm2")) {
				command = `npm run restart`;
			}
			exec(command, function(error, stdout, stderr) {
				if (error) {
					e.reply("自动重启失败，请手动重启以应用新版图鉴插件。\nError code: " + error.code + "\n" +
						error.stack + "\n");
					Bot.logger.error('重启失败\n${error.stack}');
					return true;
				} else if (stdout) {
					Bot.logger.mark("重启成功，运行已转为后台，查看日志请用命令：npm run log");
					Bot.logger.mark("停止后台运行命令：npm stop");
					process.exit();
				}
			})
		}, 1000);

	});
	return true;
}

export async function updateTemp(e){
	if (!await checkAuth(e)) {
		return true;
	}
	let command = "";
	let url=`${resPath}/BJT-Templet/`
	if (fs.existsSync(url)) {
		e.reply("开始尝试更新，请耐心等待~");
		command = `git pull`;
		let isForce = e.msg.includes("强制");
		if (isForce) {
			command = "git  checkout . && git  pull";
			// command="git fetch --all && git reset --hard origin/master && git pull "
			e.reply("正在执行强制更新操作，请稍等");
		} else {
			e.reply("正在执行更新操作，请稍等");
		}
		exec(command, {
			cwd: url
		}, function(error, stdout, stderr) {
			//console.log(stdout);
			if (/Already up to date/.test(stdout)||stdout.includes("最新")) {
				e.reply("目前所有模板都已经是最新了~");
				return true;
			}
			let numRet = /(\d*) files changed,/.exec(stdout);
			if (numRet && numRet[1]) {
				e.reply(`报告主人，更新成功，此次更新了${numRet[1]}个图片~`);
				return true;
			}
			if (error) {
				e.reply("更新失败！\nError code: " + error.code + "\n" + error.stack + "\n 请稍后重试。");
			} else {
				e.reply("体力扩展包更新成功~");
			}
		});
	} else {
		//@gitee  @SunRyK @diqiushengwu @逍遥
		command = `git clone https://gitee.com/SmallK111407/BJT-Template.git "${url}"`
		// command = `git clone https://github.com/SmallK111407/BJT-Template.git "${resPath}/xiaoyao-plus/"`;\n此链接为github图床,如异常请请求多次
		e.reply("开始尝试安装体力扩展包，可能会需要一段时间，请耐心等待~");
		exec(command, function(error, stdout, stderr) {
			if (error) {
				e.reply("角色体力扩展包安装失败！\nError code: " + error.code + "\n" + error.stack + "\n 请稍后重试。");
			} else {
				e.reply("角色体力扩展包安装成功！您后续也可以通过 #图鉴模板更新 命令来更新图像");
			}
		});
	}
	return true;
}