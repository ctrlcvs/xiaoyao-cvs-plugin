import lodash from 'lodash'
import Data from '../components/Data.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const plugin = 'xiaoyao-cvs-plugin'

const _path = process.cwd()

export async function render (app = '', tpl = '', data = {}, imgType = 'jpeg') {
  // 在data中保存plugin信息
  data._plugin = plugin
  if (lodash.isUndefined(data._res_path)) {
    data._res_path = `../../../../../plugins/${plugin}/resources/`
  }
  if(imgType == "png"){
    data.omitBackground=true;
  }
  data.imgType=imgType;
  Data.createDir(_path + '/data/', `html/${plugin}/${app}/${tpl}`)
  data.saveId = data.saveId || data.save_id || tpl
  data.tplFile = `./plugins/${plugin}/resources/${app}/${tpl}.html`
  data.pluResPath = data._res_path
  return await puppeteer.screenshot(`${plugin}/${app}/${tpl}`, data)
}

export function getRender () {
  return async function render (app = '', tpl = '', data = {}, imgType = 'jpeg') {
  // 在data中保存plugin信息
  data._plugin = plugin
  if (lodash.isUndefined(data._res_path)) {
    data._res_path = `../../../../../plugins/${plugin}/resources/`
  }
  if(imgType == "png"){
    data.omitBackground=true;
  }
  data.imgType=imgType;
  Data.createDir(_path + '/data/', `html/${plugin}/${app}/${tpl}`)
  data.saveId = data.saveId || data.save_id || tpl
  data.tplFile = `./plugins/${plugin}/resources/${app}/${tpl}.html`
  data.pluResPath = data._res_path
  return await puppeteer.screenshot(`${plugin}/${app}/${tpl}`, data)
}
}