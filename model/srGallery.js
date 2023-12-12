import fs from "fs";
import {
    Cfg, Data
} from "../components/index.js";
import lodash from 'lodash';
import Common from "../components/Common.js";

const _path = process.cwd();
let pathPlus = `${_path}/plugins/xiaoyao-cvs-plugin/resources/sr/`

export async function AtlasAlias(e, {render}) {
    let data
    data = await GetRoleData(e)
    if (data?.url)  return sendMsg(e, {render}, data.data, data.url)
    data = await GetWeaPonData(e)
    if (data?.url) return sendMsg(e, {render}, data.data, data.url)
    return false
}

export async function sendMsg(e, {render}, data, url) {
    await Common.render(url, {
        ...data
    }, {
        e,
        render,
        scale: 1.4
    })
    return true
}


export async function GetRoleData(e) {
    let name = e.msg.replace(/\*|#|星铁|星穹铁道|图鉴/g, '')

    let roleName = GetRole(name)?.name
    if(!roleName){
        return false
    }
    if(/开拓者/.test(name)){
        // roleName = "开拓者 (火)"
        e.reply("开拓者图鉴暂不支持查询")
        return false
    }
    let data = Data.readJSON(pathPlus, `character/${roleName}/data.json`)
    let items = Data.readJSON(pathPlus, 'items/data.json')
    if(!data) return false

    let baseAttr=[{key:'sp',name:'能量',num:data.sp}]
    let baseObj={
        atk:'攻击力',
        hp:'生命值',
        def: "防御力",
        speed: "速度",
        cpct: "暴击率",
        cdmg: "暴击伤害",
        aggro: "嘲讽"
    }
    for (const item of Object.keys(data.baseAttr)) {
        baseAttr.push({
            key:item,
            name:baseObj[item],
            num: parseInt(data.baseAttr[item])
        })
    }
    let growObj={
        atk:'攻击',
        hp:'生命',
        def: "防御",
        speed: "速度",
        cpct: "暴击率",
        cdmg: "暴击伤害",
        aggro: "嘲讽",
        effect:"效果命中",
        damage:"伤害",
        resist:"效果抵抗",
        break: "击破强化"
    }
    let growAttr=[]
    for (const item of Object.keys(data.growAttr)) {
        growAttr.push({
            name:growObj[item]+"强化",
            key:item,
            num: parseInt(lodash.sum(data.growAttr[item]))+"%"
        })
    }
    let newMaterial = [{...items["213"],num:294},{...items["2"],num: data.rarity==5?89600:834400}]
    for (const materialElement of data.materials) {
        for (const newMaterialElement of materialElement) {
            if([2].includes(newMaterialElement.id * 1)) continue
            if (!lodash.map(newMaterial, 'id').includes(newMaterialElement.id)) {
                newMaterial.push(newMaterialElement)
            } else {
                for (let v = 0; v < newMaterial.length; v++) {
                    if (newMaterial[v].id == newMaterialElement.id) {
                        newMaterial[v].num += newMaterialElement.num
                    }
                    newMaterial[v] = {...items[newMaterial[v].id], ...newMaterial[v]}
                }
            }
        }
    }

    data.skillMaterial=[]
    for (const [index,item] of Object.entries(data.skill_tree)) {
        let levelsMaterial=lodash.map(Object.values(item.levels), 'materials')
        for (const levelsMaterialElement of levelsMaterial) {
            for (const levelsMaterialElement1 of levelsMaterialElement) {
                if (!lodash.map(data.skillMaterial, 'id').includes(levelsMaterialElement1.id)) {
                    data.skillMaterial.push(levelsMaterialElement1)
                } else {
                    for (let v = 0; v < data.skillMaterial.length; v++) {
                        if (data.skillMaterial[v].id == levelsMaterialElement1.id) {
                            data.skillMaterial[v].num += levelsMaterialElement1.num
                        }
                        data.skillMaterial[v] = {...items[data.skillMaterial[v].id], ...data.skillMaterial[v]}
                    }
                }
            }

        }
    }

    for (const [i,item] of Object.entries(data.skillsData)) {
        let newAttributeBuff=[]
        if(item?.AttributeBuff&&item.AttributeBuff.length>0){
            for (const item1 of item.AttributeBuff) {
                let text = item1.replace(/:|：/,":").split(':')
                newAttributeBuff.push({
                    key:text[0],
                    isType:text[0].includes('额外')?"extra":"attribute",
                    value:text[1]
                })
            }
        }

        data.skillsData[i].newAttributeBuff=newAttributeBuff
    }
    data.materials = newMaterial
    data.baseAttr=baseAttr
    data.growAttr=growAttr
    return {data,url: 'sr/character/index'}
}


export async function GetWeaPonData(e) {
    let name = e.msg.replace(/\*|#|星铁|(四|4)星|(五|5)星|星穹铁道|图鉴|专武/g, '')
    let list = Data.readJSON(pathPlus, 'weapon/data.json')
    let items = Data.readJSON(pathPlus, 'items/data.json')
    let role = GetRole(name)
    let isUp = false;
    if (role) {
        name = role.name
        isUp = true
    }
    let roleData, roleList = [];
    lodash.forEach(list, (v, k) => {
        if (isUp && v.belongRole.includes(name)) {
            roleList.push(v)
            return
        } else if ([v.name, ...v.names, ...v?.suitRole].includes(name) && !isUp) {
            roleList.push(v)
            return
        }
    })
    let isUp4 = /4|四/.test(e.msg)
    let isUp5 = /5|五/.test(e.msg)
    if (roleList.length == 0) return false
    roleData = roleList[0]
    for (const role of roleList) {
        if (isUp4 && role.star == 4) {
            roleData = role
        } else if (isUp5 && role.star == 5) {
            roleData = role
        } else if (!isUp4 && !isUp5 && roleData.star < role.star) {
            roleData = role
        }
    }
    if (roleData) {
        let newMaterial = []
        for (const materialElement of roleData.material) {
            for (const newMaterialElement of materialElement) {
                if (!lodash.map(newMaterial, 'id').includes(newMaterialElement.id) && ![2].includes(newMaterialElement.id * 1)) {
                    newMaterial.push(newMaterialElement)
                } else {

                    for (let v = 0; v < newMaterial.length; v++) {
                        if (newMaterial[v].id == newMaterialElement.id) {
                            newMaterial[v].num += newMaterialElement.num
                        }
                        newMaterial[v] = {...items[newMaterial[v].id], ...newMaterial[v]}
                    }
                }
            }
        }
        roleData.material = newMaterial
        for (const item of Object.keys(roleData.fullValues)) {
            let {base, stop} = roleData.fullValues[item]
            roleData.fullValues[item] = {
                base: parseInt(base), stop: parseInt(stop)
            }
        }
        let suitRole = []
        for (const item of roleData.suitRole) {
            let list = GetRole(item)

            if (roleData.belongRole.includes(item)) list.isUp = true
            suitRole.push(list)
        }
        roleData.suitRole = suitRole
    }
    return {data: roleData, url: `sr/weapon/index`}

}

let GetRole = (name) => {
    let list = Data.readJSON(pathPlus, 'character/data.json')
    let role;
    lodash.forEach(list, (v, k) => {
        if ([v.name, ...v.names].includes(name)) {
            role = v
        }
    })
    return role
}


