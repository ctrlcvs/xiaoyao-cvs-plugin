import {
	Cfg,
	Data
} from "../components/index.js";
import fs from "fs";
import fetch from "node-fetch";
import utils from "../model/mys/utils.js";
import {
	segment
} from "oicq";
let path = './data/map'
//mapId-地图别名
let getPath={
	"&map_id=7":["渊下宫",'渊下'],
	"&map_id=9":['璃月地下','层岩地下','层岩']
}
export async function genShenMap(e){
	let msg= e.msg.replace(/#|(哪|那)|里|在/g,"")
	var urlFile = fs.readdirSync(`./data/map/`);
	let msgPath=`${path}/${msg}.jpg`
	if(urlFile.includes(`${msg}.jpg`)){
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