import path from 'path'
import lodash from 'lodash'
import {
	Cfg
} from "./components/index.js";
/**
 *  支持锅巴
 *  锅巴插件：https://gitee.com/guoba-yunzai/guoba-plugin.git
 *  组件类型，可参考 https://vvbin.cn/doc-next/components/introduction.html
 *  https://antdv.com/components/overview-cn/
 */

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'xiaoyao-cvs-plugin',
      title: 'xiaoyao-cvs-Plugin',
      author: '@逍遥 @cvs',
      authorLink: 'https://gitee.com/Ctrlcvs',
      link: 'https://gitee.com/Ctrlcvs/xiaoyao-cvs-plugin',
      isV3: true,
      isV2: true,
      description: '主要提供原神图鉴系列数据、以及米游币签到等功能',
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      icon: 'mdi:stove',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      iconColor: '#6bb9dd',
      // 如果想要显示成图片，也可以填写图标路径（绝对路径）
      // iconPath: path.join(_paths.pluginRoot, 'resources/images/icon.png'),
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
		{
		  field: 'sys.Atlas',
		  label: '图鉴匹配',
		  bottomHelpMessage: '是否指定图鉴结尾匹配数据',
		  component: 'Switch',
		},
		{
		  field: 'Atlas.all',
		  label: '图鉴目录',
		  bottomHelpMessage: '是否使用插件的图鉴数据',
		  component: 'Switch',
		},
		{
		    field: 'sys.help',
		    label: '默认帮助',
		    bottomHelpMessage: '使用图鉴插件帮助为默认帮助',
		    component: 'Switch',
		},
        {
          field: 'sys.Note',
          label: '体力',
          bottomHelpMessage: '使用图鉴插件体力为默认体力',
          component: 'Switch',
        },
        {
          field: 'mb.len',
          label: '体力模板',
          bottomHelpMessage: '体力模板类型',
          component: 'Select',
          componentProps: {
            options: [
              {label: '随机', value: '0'},
              {label: '正方形模板', value: '1'},
              {label: '长方形模板', value: '2'},
            ],
            placeholder: '请选择体力模板类型',
          },
        },
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      getConfigData() {
        return lodash.omit(Cfg.merged(), 'jwt')
      },
      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData(data, {Result}) {
		
		for (let [keyPath, value] of Object.entries(data)) {
		   Cfg.set(keyPath,value)
		}
		
     
        return Result.ok({}, '保存成功~')
      },
    },
  }
}
