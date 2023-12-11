import {
	Cfg,
	Data
} from "../components/index.js";
import fs from "fs";
import fetch from "node-fetch";
import utils from "../model/mys/utils.js";
let path = './data/map'
//mapId-地图别名
let getPath={
	"&map_id=7":["渊下宫",'渊下'],
	"&map_id=9":['璃月地下','层岩地下','层岩']
}
export const rule = {
	genShenMap: {
		reg: "^#(刷新|更新)?(.*)(在(哪|那)里*)$",
		describe: "地图资源查询 #**在哪里",
	},
	delMapData: {
		reg: "^#(清空|清除)地图(缓存)?数据$",
		describe: "清空地图下载数据",
	},
}

export async function delMapData(e){
	let urlFile = fs.readdirSync(path);
	let count=0;
	for (const item of urlFile) {
		try {
			await fs.unlinkSync(`${path}/${item}`)
			count++;
		} catch (error) {
			e.reply('清空地图数据异常~')
		}
	}
	e.reply(`共清除${count}个地图数据~\n您后续可通过直接重新获取地图资源数据~`)
	return true
}

export async function genShenMap(e){
	let isBool=/刷新|更新/.test(e.msg)
	let msg= e.msg.replace(/#|哪|(里|那里)|在|刷新|更新/g,"")
	let urlFile = fs.readdirSync(path);
	let msgPath=`${path}/${msg}.jpg`
	if(urlFile.includes(`${msg}.jpg`)&&!isBool){
		await e.reply(segment.image(`file://${msgPath}`))
		return true;
	}
	let data=await exReg(msg);
	let url=`https://map.minigg.cn/map/get_map?resource_name=${data.msg}&is_cluster=false${data.item}`
	let res=await fetch(url,{method:'get'})
	try{
		res=await res.json()
		if(res.retcode==-1){
			await e.reply(`${res.message}`)
			return true;
		}
	}catch(ex){
		await Data.downFile(url,msgPath)
		await e.reply(segment.image(`file://${msgPath}`))
		return true;
	}
	return false;
}
async function exReg(msg){
	for (const item of Object.keys(getPath)) {
		let reg =new RegExp(`${getPath[item].join('|')}`,'g')
		if(reg.test(msg)){
			return {item,msg:msg.replace(reg,'')}
		}
	}
	return {item:'',msg}
}
init()
/** 初始化创建配置文件 */
  function init () {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
  }
