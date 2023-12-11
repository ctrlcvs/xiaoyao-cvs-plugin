import { createApps } from 'alemonjs'
import * as apps from './index.js'
import { render } from './adapter/render.js'
const xiaoyao = YUNZAIV2(apps['rule'], apps)
const app = createApps(import.meta.url)
app.setMessage(async e => {
  await runtime.init(e)
  e.sender = {}
  e.sender.card = e.user_name
  e.checkAuth = val => val
  return e
})
app.setArg(() => [{ render }])
app.setCharacter('#')
app.component({ xiaoyao })
app.mount()
