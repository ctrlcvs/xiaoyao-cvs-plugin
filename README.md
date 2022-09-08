#### 介绍
# xiaoyao-cvs-plugin

yunzai-bot扩展图鉴以及体力优化; 

项目仅供学习交流使用，严禁用于任何商业用途和非法行为

#### 介绍

介绍

原神图鉴插件。

#### 软件架构
由逍遥佬自行制作的原神图鉴，按业务分类整理。图片更新时替换对应路径的文件，保持图片url不变。


#### 安装教程
使用gitee
```
git clone https://gitee.com/Ctrlcvs/xiaoyao-cvs-plugin.git ./plugins/xiaoyao-cvs-plugin/
```
使用github
```
git clone https://github.com/Ctrlcvs/xiaoyao-cvs-plugin.git ./plugins/xiaoyao-cvs-plugin/
```


#### 使用说明

1.  配合云崽使用, https://gitee.com/Le-niao/Yunzai-Bot
2.  V3版本安装报错的话请用指令引入包
```
pnpm add superagent -w
```

```
pnpm add promise-retry -w
```
3.  V2版本安装报错指令引入包
```
cnpm i yaml
```

```
cnpm i superagent
```

```
cnpm i promise-retry
```
#### 命令说明
1. 发送 【#图鉴更新】 获取最新的图鉴记录。(必须)
2. 发送 【#**图鉴】 进行触发，例如发送 #刻晴图鉴，即可返回对应的图片信息。
3. 发送 【#图鉴插件更新】获取最新代码
4. 别名文件在 /xiaoyao-cvs-plugin/resources/Atlas_alias 目录下面，当前只支持食物及原魔的别名
5. 树脂背景图文件在 /xiaoyao-cvs-plugin/resources/dailyNote/background_image 目录下
6. 发送 #图鉴帮助 获取帮助面板
7. 发送 #图鉴设置 获取图鉴管理面板
8. 发送 #图鉴版本 获取图鉴更新日志
9. 其余具体功能通过 #图鉴帮助 #图鉴版本 查看
10. 发送 #崩坏3签到 可签到崩坏3游戏模块 具体支持【崩坏3、崩坏2、未定义事件】
11. 发送 #云原神签到 可签到云原神游戏
12. 默认配置文件位于 ./plugins/xiaoyao-cvs-plugin/defSet/config/config.yaml
 
## 其他
<!---
- 有什么问题、Bug，或有其它建议，欢迎提 [issue](https://github.com/Ctrlcvs/xiaoyao-cvs-plugin/issues)
-->
- [爱发电](https://afdian.net/a/Ctrlcvs)
- 最后再求个star，你的支持是维护本项目的动力~~
- 图片素材来源于网络，仅供交流学习使用
- 严禁用于任何商业用途和非法行为
- Yunzai-Bot 官方QQ群：213938015 （暂时停止新加入）
- 喵喵Miao-Plugin QQ群：607710456 （暂时停止新加入）
- 图鉴xiaoyao-cvs-Plugin QQ群：[544570609](https://jq.qq.com/?_wv=1027&k=GOHommWT)
