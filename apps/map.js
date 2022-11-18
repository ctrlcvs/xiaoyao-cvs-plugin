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

export async function genShenMap(e){
	let msg= e.msg.replace(/#|(哪|那)|里|在/g,"")
	var urlFile = fs.readdirSync(`./data/map/`);
	let msgPath=`${path}/${msg}.jpg`
	if(urlFile.includes(`${msg}.jpg`)){
		await e.reply(segment.image(`file://${msgPath}`))
		return true;
	}
	let url=`https://map.minigg.cn/map/get_map?resource_name=${msg}&is_cluster=false`
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
init()
/** 初始化创建配置文件 */
  function init () {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
  }