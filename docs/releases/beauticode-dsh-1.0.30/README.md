# beauticode-dsh 1.0.30

日期：2026-10-11。发布范围仅为 DSH 独立包；Desktop 聚合包保持本地候选。

已发布至 [npm beauticode-dsh@1.0.30](https://www.npmjs.com/package/beauticode-dsh/v/1.0.30)，`latest` 指向 `1.0.30`。远程 tarball 与实测 tarball 的 SHA-1、SHA-512、SHA-256 一致，全部 49 个文件摘要相同。

## 变化

以已核验的正式 `beauticode-dsh@1.0.29` tarball 为底座加入 #92 修复，支持 DSH Web 与官方 Desktop 的插件页局部实色底板。标题、分组、卡片、详情、配置和加载／空／错误区域受保护，分组间隙继续显示壁纸；说明及计数采用宿主 secondary 标签色。

保留主分支已合并的问答、计划、审批面板保护。沿用既有「功能面板不透明」开关、偏好存储、跨窗口同步及注入鉴权协议。

本次只修改 `readability.js`、版本号和 README，其余 46 个文件与 1.0.29 逐字节一致；保留 #86 画窗磨砂／阴影以及 #87 长内容抖动修复。修复源码提交为 `071f5d9`。

## 验证与证据

正式 tarball 重新解包后回归 16/16，通过且无跳过：插件页浏览器行为 6 项、#86／#87 背景行为 3 项、偏好与已有面板保护 6 项、Web／Desktop 注入及鉴权 1 项。

已完成长内容属于验证范围；没有新增真实流式会话或长期压力测试。共享修复此前在官方 Desktop 0.2.0-rc.2 及同版本真实 Web 验收。

- `release-manifest.json`：底座、源码提交、49 个包文件摘要和正式 tarball 摘要。
- `registry-verification.json`：发布后从 npm 下载精确版本，核验名称、版本、必需文件、SHA-1 和 SHA-512。
- `dist-tags.json`：发布后的 npm 标签。
- `publication-verification.json`：远程 tarball 与实测 tarball、49 个文件逐字节比对。

## 回滚

关闭「功能面板不透明」或清除背景即可恢复原显示；也可恢复 1.0.29，无需配置迁移。独立安装器为安装入口，旧版 `--help` 会执行安装，不应用于只读检查。
