import {
    Cfg
} from "../components/index.js";

import {AtlasAlias} from '../model/srGallery.js'


export async function srAtlasAlias(e,{render}) {
    if (!Cfg.get("sr.Search")) {
        return false;
    }
    let reg = /(#|\*)(.*)/;
    if (Cfg.get("sr.Atlas")) {
        reg = /(#|\*)?(.*)图鉴/;
    }
    if (!reg.test(e.msg)) {
        return false;
    }
    return await AtlasAlias(e,{render})
}