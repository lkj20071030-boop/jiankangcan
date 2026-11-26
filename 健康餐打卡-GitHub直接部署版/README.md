# 好好吃饭 · GitHub Pages 直接部署版

无后端、无账号、无需 API Key、无需构建。成品就是根目录的 `index.html`，包含全部界面和脚本。保留健康餐记账、餐饮总额、每日总结打卡、历史补记、修改删除、预算设置、近 7 天统计、JSON 导入导出。

## 最简单的部署方法

1. 在 GitHub 创建一个仓库，例如 `meal-diary`。使用免费个人账号时，选择 Public（公开）即可使用 GitHub Pages。
2. 点击 **Add file → Upload files**，上传本文件夹中的 **`index.html`**，点击 **Commit changes**。只上传这一个文件即可，**不要把 ZIP 压缩包当作网页上传**，也不要再套一层文件夹。
3. 打开仓库 **Settings → Pages**。
4. **Build and deployment → Source** 选择 **Deploy from a branch**。
5. **Branch** 选择 **main**，目录选择 **/(root)**，点击 **Save**。
6. 等待 GitHub 完成发布，Pages 设置页会显示网站链接。通常形如 `https://你的用户名.github.io/meal-diary/`，把它分享给朋友即可。

也可以把完整源码文件夹里的内容上传到仓库根目录，`index.html` 仍会直接运行。本项目不需要配置 GitHub Secrets、不需要运行 npm、不依赖任何付费外部服务。

## 数据库在哪里

使用浏览器内置 **IndexedDB** 数据库。餐费、预算、每天的感想与打卡存入数据库，刷新网页、关闭后重新打开仍可读取。每个仓库路径使用独立数据库，多标签页写入有版本冲突保护。

**本版没有云端数据库，不提供跨设备同步。** 分享网页只分享软件；每个人的数据保存在自己当前浏览器，不会上传到 GitHub，也看不到别人的记录。换手机、换浏览器、换网站域名或仓库路径时，需要先导出 JSON，再在新网页导入。

清理网站数据、使用无痕模式或浏览器回收存储可能导致记录丢失。请定期点击 **导出备份**；也可以点击 **申请存储保护**，是否授予由浏览器决定，即使获批也不能防止手动清理数据。

旧云端版本的记录需要在原网页导出 JSON，再到本版导入。本版兼容原来的备份结构。导入会替换本机当前账本，先备份再操作。

## 修改源码（可选）

- `src/template.html`：页面结构。
- `src/style.css`：样式。
- `src/app.js`：记账与总结功能。
- `src/storage.js`：IndexedDB 事务读写与冲突检查。
- `build.mjs`：把源码合成为单个 `index.html`。
- `tests/`：数据库与页面逻辑测试；测试依赖不会被打进网页。

安装 Node.js 22 以上版本后：

```sh
npm ci
npm run build
npm test
```

改完 `src` 后执行 `npm run build`，再把新的 `index.html` 上传 GitHub 即可。测试使用 fake-indexeddb 验证数据库事务行为与前端交互，不等同于所有浏览器实机测试。

本地预览可以使用任意静态 HTTP 服务；推荐使用 GitHub Pages 提供的 HTTPS 地址访问，不以双击 `file://` 的行为作为部署依据。

部署依据：[GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。存储说明：[MDN 浏览器存储与回收](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)。
