import { Cfg } from "../components/index.js";
import { segment } from "oicq";
import lodash from "lodash";
import { currentVersion, changelogs } from "../components/Changelog.js";
import Common from "../components/Common.js";
const _path = process.cwd();

const helpFilePath = `${_path}/plugins/xiaoyao-cvs-plugin/resources/help/help-list.js`;
const path_=`/plugins/xiaoyao-cvs-plugin/resources/common/layout/`;
export async function help(e, { render }) {
  if (!/图鉴/.test(e.msg) && !Cfg.get("sys.help", false)) {
    return false;
  }
  let helpFile = {};
  helpFile = await import(`file://${helpFilePath}?version=${new Date().getTime()}`);

  const { helpCfg } = helpFile;
  let helpGroup = [];

  lodash.forEach(helpCfg, (group) => {
    if (group.auth && group.auth === "master" && !e.isMaster) {
      return;
    }


    lodash.forEach(group.list, (help) => {
      let icon = help.icon * 1;
      if (!icon) {
        help.css = `display:none`;
      } else {
        let x = (icon - 1) % 10, y = (icon - x - 1) / 10;
        help.css = `background-position:-${x * 50}px -${y * 50}px`;
      }

    });

    helpGroup.push(group);
  });

  return await Common.render_path("help/index", {
    helpCfg: helpGroup,
    element: 'default'
  }, { e, render, scale: 1.2 },path_)
}

export async function versionInfo(e, { render }) {
	return await Common.render_path("help/version-info", {
	  currentVersion,
	  changelogs,
	  elem: "cryo",
	}, { e, render, scale: 1.2 },path_)
}
