# 好好吃饭 · 餐费打卡（数据库版）

支持逐餐记录、健康餐标记、每日总结和打卡、7 天趋势、月预算、历史补记、编辑删除和 JSON 备份。默认预算为每日 45 元、每周 315 元、每月 1350 元；健康餐已经包含在餐饮总额中。

## 本地运行

安装 Node.js 24 或更高版本。无需安装任何第三方依赖。在本文件夹打开终端执行：

```powershell
npm start
```

打开 http://127.0.0.1:4173 。数据库自动建立在 `data/meals.sqlite`，关闭服务再启动仍保留数据。Ctrl+C 停止。此模式只绑定本机地址，固定使用 `local-owner`，不提供多人登录，请勿将本地服务直接暴露到互联网。

备份数据库文件时先停止服务，复制整个 `data` 文件夹（含可能存在的 WAL 文件）；也可随时使用页面“导出备份”。本地与线上数据库相互独立，通过 JSON 导入导出迁移。

## 源码结构

- `public/`：HTML、CSS、前端交互源码。
- `server/api.mjs`：数据库 API、身份检查、金额校验和版本冲突保护。
- `server/sqlite.mjs`：本地 SQLite 适配和首次迁移。
- `server/local.mjs`：本地 HTTP 服务。
- `drizzle/`：云端数据库 SQL 迁移及迁移日志。
- `scripts/build.mjs`：将前端与 API 打包为 Cloudflare Worker。
- `.openai/hosting.json`：现有 Sites 项目及 D1 绑定配置。
- `dist/`：构建输出；修改源码后执行 `npm run build` 重新生成。
- `tests/`：持久存储、用户隔离、并发写入等测试。

## 线上存储与部署

线上运行于私有 Sites，使用平台配置的 D1 数据库 `DB` 绑定。账号身份来自 Sites 在服务端验证后的 `oai-authenticated-user-id`。每个账号独立一份餐费账本，使用整数“分”保存金额。数据采用 SQLite 表 `meal_documents` 存储，经服务端校验后整体事务更新；`revision` 乐观锁防止不同设备或标签页覆盖彼此记录。

```powershell
npm test
npm run build
```

Sites 发布工具将源码推送、构建产物和 `drizzle` 迁移打包并在上线前应用迁移。源码包不含数据库凭证，数据库由 Sites 提供绑定。若自行部署 Cloudflare，需要另行创建 D1，配置绑定 `DB`，应用 SQL 迁移，并在可信代理中提供已验证身份；不要直接信任公网客户端自行发送的身份头。

## 同步和旧记录

页面打开时从数据库加载，每次修改后自动保存；页面底部显示同步状态。失败后暂停编辑，避免误覆盖。可先导出尚未同步的内容，再刷新。浏览器只保留恢复草稿，数据库为正式记录来源。

如果同一浏览器中保留旧版记录，页面底部提供“迁入旧版浏览器记录”。迁入或导入会替换当前账本，需要先备份。不同设备登录同一账号后刷新即可读取最新记录；当前页面不会实时推送更新。保存时若发现其他设备已更改，会提示冲突并停止保存，不自动合并。

## 数据库结构

`meal_documents(owner_id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)`。

`payload` 包含预算、餐费明细数组、按日期索引的每日打卡与感想；API 为 `GET /api/data` 和 `PUT /api/data`，更新体为 `{data, revision}`。服务端限制金额、日期、记录数量和请求体大小。PUT 仅接受同源 JSON。
