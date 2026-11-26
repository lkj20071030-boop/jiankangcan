# 好好吃饭 · 电脑手机同步版

网页仍部署到 GitHub Pages。使用 Supabase Auth 邮箱登录和 PostgreSQL 云端数据库，电脑、手机登录同一账号后读取同一份餐费、预算、打卡与每日感想。无需自己启动后端服务器。

**源码已实现同步流程，但必须接入你自己的 Supabase 项目后才能使用。当前 config.js 为空，不代表已经上线可同步。**

## 一次性配置

1. 在 Supabase 创建项目，等待数据库就绪。
2. 打开 SQL Editor，复制执行 `supabase/schema.sql`，创建账本表、RLS 用户隔离策略和带版本检查的保存函数。
3. 在项目的 API/Connect 设置中找到 Project URL 与 **publishable key**（旧项目的 anon key 也支持）。把它们填写到根目录 `config.js` 的 `url` 和 `publishableKey`。
4. 浏览器代码只能使用可公开的 publishable/anon key。**不要上传 service_role、secret key、数据库密码**。数据库隔离依靠登录账号 JWT 与 RLS，公钥本身不授予查看其他人记录的权限。
5. 在 Supabase 的 Authentication 中启用 Email 登录。将 URL Configuration 的 Site URL 和允许 Redirect URLs 都设置为最终 GitHub Pages 地址，例如 `https://用户名.github.io/meal-diary/`，包括仓库路径。保留注册邮箱确认；按需要配置 SMTP 邮件发送服务及相关限额。
6. 把 **index.html 和 config.js** 上传 GitHub 仓库根目录。Settings → Pages → Deploy from a branch → main / (root) → Save。
7. 在网页用邮箱和至少 8 位密码注册，按邮件确认，然后在电脑和手机上登录同一账号。若迟迟没有确认邮件，请检查垃圾箱及 Supabase 邮件发送设置/限额。

上传已生成的这两个文件即可，不需要 npm。不建议将 config.js 配成页面让每个用户填写；它是网站部署者统一配置的公开连接信息。

## 同步行为

- 修改后自动保存到云端，页面底部显示是否保存成功。
- 网页处于前台时每 15 秒检查更新，切回网页时也会检查；可以点击“同步最新记录”。正在填写一餐或修改感想、预算时暂缓覆盖，保存后或结束编辑后再拉取。
- 两台设备同时编辑同一个旧版本时，服务器拒绝过期写入，不自动覆盖。提示冲突后先导出本机内容，再刷新加载最新记录并重新修改。
- 无网络时不会假装保存成功。写入失败会停止编辑；本机保留按账号区分的恢复草稿，恢复网络后刷新，再根据需要导出/恢复草稿。
- 退出只退出当前设备。建议在个人可信设备使用“保持登录”行为；不要把账号密码分享给他人。

## 迁移已有记录

先在旧版网页“导出备份”，在新版登录后“导入备份”。导入会替换当前账号的云端账本，随后其他设备会读到这份数据。先备份，不需要手动搬数据库文件。

## 开发与验证

```sh
npm ci
npm run build
npm test
```

`src/storage.js` 使用官方 supabase-js 客户端处理登录会话与令牌续期。`src/cloud-core.mjs` 处理读写，`src/app.js` 处理记账、登录面板与定时同步。打包器已将 SDK 放进 index.html，无需浏览器额外访问 CDN。

测试在 PGlite PostgreSQL 引擎执行实际建库 SQL，验证 RLS 隔离、匿名拒绝、账号切换保护、版本冲突以及双客户端数据读取。此测试不代替真实 Supabase 项目的邮件登录及电脑手机联网验收。真实项目尚未配置前，不能宣称线上同步已验证。

参考：[Supabase 注册](https://supabase.com/docs/reference/javascript/auth-signup)、[RLS 账号隔离](https://supabase.com/docs/guides/database/postgres/row-level-security)。
