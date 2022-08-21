import { Cfg } from "./index.js";
import { segment } from "oicq";
import { currentVersion, yunzaiVersion,isV3 } from "./Changelog.js";
export const render = async function (path, params, cfg) {
  let paths = path.split("/");
  let { render, e } = cfg;
  let _layout_path = process.cwd() + "/plugins/xiaoyao-cvs-plugin/resources/";
  let layout_path= process.cwd() + "/plugins/xiaoyao-cvs-plugin/resources/common/layout/";
  let base64 = await render(paths[0], paths[1], {
    ...params,
    _layout_path,
	 _tpl_path: process.cwd() + '/plugins/xiaoyao-cvs-plugin/resources/common/tpl/',
    defaultLayout: layout_path + "default.html",
    elemLayout: layout_path + "elem.html",
    sys: {
      scale: Cfg.scale(cfg.scale || 1),
      copyright: `Created By Yunzai-Bot<span class="version">${yunzaiVersion}</span> &  xiaoyao-cvs-Plugin<span class="version">${currentVersion}</span>`
    }
  },"png");
 let ret = true
  if (base64) {
    ret = isV3 ? await e.reply(base64) : await e.reply(segment.image(`base64://${base64}`))
  }
  return cfg.retMsgId ? ret : true
}

export const render_path = async function (path, params, cfg,path_) {
  let paths = path.split("/");
  let { render, e } = cfg;
  let _layout_path = process.cwd() + path_;
  let base64 = await render(paths[0], paths[1], {
    ...params,
    _layout_path,
	_tpl_path: process.cwd() + '/plugins/xiaoyao-cvs-plugin/resources/common/tpl/',
    defaultLayout: _layout_path + "default.html",
    elemLayout: _layout_path + "elem.html",
    sys: {
      scale: Cfg.scale(cfg.scale || 1),
      copyright: `Created By Yunzai-Bot<span class="version">${yunzaiVersion}</span> & xiaoyao-cvs-Plugin<span class="version">${currentVersion}</span>`
    }
  });
 let ret = true
  if (base64) {
    ret = isV3 ? await e.reply(base64) : await e.reply(segment.image(`base64://${base64}`))
  }
  return cfg.retMsgId ? ret : true
}



export default {
  render,render_path,
  cfg: Cfg.get,
  isDisable: Cfg.isDisable
};