# 源码工作区的平台验证与 Windows 测试隔离

日期：2026-10-12。状态：实施。

## 问题与证据

主分支 [CI 38132448422](https://github.com/starsstreaming/beautiCode/actions/runs/38132448422)
在 Ubuntu 安装阶段因 `beauticode-desktop` 工作区的 `os: win32` 声明退出，
Windows 两个 Node 版本均在快捷方式测试中只报告被截断的 CLIXML 进度输出。
此前同一提交的 PR 检查还出现 DSH 目录替换竞态和多项 Windows 子进程超时。

## 决策

- 源码工作区允许在 CI 的 Linux、Windows 上安装；聚合打包器负责写入正式产物的
  `os: ["win32"]`，保留用户安装契约。源码及产物契约分别验证，避免使用 `--force`
  绕过 npm 对平台及引擎的检查。
- Desktop 测试采用现有长路径临时目录运行器，并串行执行测试文件，避免多个
  PowerShell、复制 Node 校验和快捷启动用例同时争用 hosted runner 的资源。
  原有用例与超时边界保留，不通过跳过测试或无边界重试变绿。
- 快捷方式进程禁用 PowerShell 进度输出，明确文本格式，保留有界输出缓冲；
  优先报告 ENOBUFS、ETIMEDOUT 等真实进程错误码，不让 CLIXML 掩盖失败原因。
- DSH 写事务持有 busy 状态时，监视器不得读取活动清单。该读取会初始化
  `active` 目录，可能在目录原子替换的中间阶段重新创建目标目录。已有读任务
  仍由事务入口等待完成，后续 tick 则在入口处退出。

## 验证与回滚

回归覆盖 busy 期间零读取、空闲后恢复读取、48 KiB 子进程诊断输出及错误码、
源码与发布产物的不同平台契约，并保留真实 Windows 快捷方式端到端验证。
合并前要求四个操作系统／Node 组合均通过 CI；变更没有数据迁移，可回退本提交。
