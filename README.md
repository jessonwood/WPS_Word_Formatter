# WPS Word Formatter

> WPS 文字（WPS Writer）本地智能文档排版、结构识别、格式清理、体检与安全备份加载项。

![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Status](https://img.shields.io/badge/status-beta-orange)
![License](https://img.shields.io/badge/license-MIT-yellow)

## 当前版本

`v1.0.0`

v1.0 聚焦“选模板/接受推荐 → 扫描 → 预览 → 一键整理并排版”的简单使用流程；高级设置仍保留但默认收起。

## 已验证运行环境

当前真实 WPS 宿主验证基线：

- Windows x64
- **WPS 文字 11.8.2.12094**（WPS Office 的一部分）
- 本地离线 WPS JS Add-in
- 项目上传 GitHub 前，核心功能已在上述本机环境完成实机测试并通过

以下环境**尚未完成系统性实机验证，因此不作正式兼容承诺**：

- macOS
- Linux
- 其他 WPS 11.x / 12.x 构建版本
- WPS 365 的不同构建版本

如在这些环境测试成功，欢迎提交 Issue / PR 补充兼容矩阵。

## 核心功能

- 智能识别主标题、副标题、多级标题、正文、附件、表题和图题。
- 识别置信度、冲突仲裁、人工角色覆写与文档定位。
- 多套内置排版模板与本地自定义模板管理。
- 最小改动排版（Minimal Fix）与完整标准化（Full Normalize）。
- Dry Run 预览与变更计划。
- 页眉、页脚、页码和自动目录。
- 文档清理与结构体检评分。
- 全文 / 标题 / 正文 / 表格等局部排版范围。
- WPS 原生 Undo、内存快照与文本完整性校验。
- 排版前同目录物理备份及备份历史管理。
- WPS API / FileSystem 环境能力诊断。

> 内置“机关公文”模板是参考 GB/T 9704-2012 等公开规范要求设计的项目预置模板，并不表示获得任何官方认证或授权。

## 安全设计

会修改文档的主流程按以下链路执行：

```text
变更计划
→ 文档备份
→ 文本签名基线
→ WPS UndoRecord
→ 内存快照
→ 格式执行
→ 文本完整性校验
→ 成功提交 / 异常回滚
```

项目定位为本地离线工具，不要求云 API，也不上传文档。

## 技术架构

```text
src/
├─ addin/wps/                         # WPS Ribbon / TaskPane / 宿主能力
├─ modules/wordFormatter/
│  ├─ adapters/                       # WriterAdapter / WPS 宿主适配层
│  ├─ core/
│  │  ├─ audit/                       # 结构体检
│  │  ├─ backup/                      # 物理备份
│  │  ├─ cleanup/                     # 文档清理
│  │  ├─ diagnostics/                 # WPS / FileSystem 环境诊断
│  │  ├─ formatting/                  # 排版引擎
│  │  ├─ headersFooters/              # 页眉页脚页码
│  │  ├─ planning/                    # Minimal Fix / Dry Run
│  │  ├─ recognition/                 # 结构识别
│  │  ├─ scanner/                     # 文档扫描
│  │  ├─ snapshot/                    # 快照与恢复
│  │  ├─ toc/                         # 自动目录
│  │  └─ validation/                  # 完整性校验
│  ├─ components/                     # Vue UI
│  ├─ services/                       # 业务门面
│  ├─ stores/                         # Pinia
│  ├─ templates/                      # 内置模板
│  └─ types/                          # 类型定义
└─ shared/                             # 日志、持久化、工具函数
```

Vue 组件不应直接访问 WPS 宿主对象；WPS API 访问应集中在适配层或宿主桥接层。生产环境使用严格的 WPS Adapter；浏览器开发预览使用独立 Mock Adapter，避免宿主异常时静默落入模拟数据。

## 安装正式 Release（推荐）

从 GitHub Releases 下载 `wps-word-formatter-<version>.zip` 后解压，直接运行：

```text
install_release.bat
```

Release 包已经包含编译后的 WPS 加载项，**终端用户不需要安装 Node.js、npm，也不需要本地执行构建**。

安装器会：

1. 将预编译加载项部署至当前用户 WPS JS Add-in 目录；
2. 在已有 `publish.xml` 中仅新增或更新 `WpsWordFormatter` 节点；
3. 保留其他 WPS JS 加载项注册信息；
4. 不修改 `%APPDATA%\WPSWordFormatter` 下的用户模板、设置和备份历史。

卸载运行：

```text
uninstall_offline.bat
```

卸载脚本只移除 `WpsWordFormatter` 自己的注册与程序目录，并保留其他 WPS 加载项以及用户配置数据。

## 本地开发

要求：Node.js 22 + npm。

```bash
npm ci
npm run typecheck
npm test
npm run build
```

开发模式：

```bash
npm run dev
```

开发者在源码目录进行 WPS 离线部署可运行：

```bash
npm run deploy:offline
```

或：

```text
install_offline.bat
```

该开发安装流程会先执行生产构建，再部署当前源码产物。

## 测试与 CI

GitHub Actions 对 Pull Request、`main` 和开源加固分支执行：

```text
npm ci
npm audit
npm run typecheck
npm test
npm run build
```

单元测试用于验证核心算法和 Mock/Adapter 行为。真实 WPS 宿主功能已在 WPS 文字 11.8.2.12094 上完成过本机验证；后续如修改宿主 Adapter、安装流程或关键 WPS JSAPI 调用，仍应在真实 WPS Writer 中做回归测试。

## 发布方式

源代码仓库不提交 `.7z` / `.zip` 构建包。Beta/正式构建产物通过 GitHub Releases 发布，并同时生成 SHA-256 校验文件。

Release 工作流必须先通过依赖安全审计、类型检查、单元测试和生产构建后才能创建发布包。

## 隐私与问题反馈

提交 Issue、日志或截图前请移除：

- 客户或业务数据
- 用户姓名、账号、证件号等个人信息
- 本机用户名和私人路径
- 邮箱、Token、密钥和凭据
- 真实生产文档内容

建议始终使用合成测试数据复现问题。

## 致谢与第三方许可

本项目的部分产品设计思路受到 `cwyalpha/Word-Formatter-Pro` 的启发。该项目采用 MIT License：Copyright (c) 2025 cwyalpha。

详细第三方声明见 `THIRD_PARTY_NOTICES.md`。

## 贡献

参见 `CONTRIBUTING.md`。

## 安全

参见 `SECURITY.md`。

## License

本项目以 MIT License 发布。具体条款见 `LICENSE`。
