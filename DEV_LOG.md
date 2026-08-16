# WPS Word Formatter 开发与版本记录

> 本文件保留主要研发阶段记录。对外发布状态以 `README.md`、`CHANGELOG.md` 和 GitHub Release 为准。

## 项目概述

- 技术栈：WPS JS Add-in + Vue 3 + TypeScript + Vite + Pinia + Vitest
- 产品定位：WPS Writer 本地离线文档规范化、排版修复、结构体检与安全备份工具
- 当前公开发布候选：`v0.9.0-beta.1`
- 当前实机验证基线：Windows 10/11 x64 + WPS Writer 12.0

## 主要研发阶段

### 1. WPS Writer 加载项底座

完成 Ribbon、TaskPane、WPS 宿主桥接和 Vue/Pinia 前端底座。WPS API 访问通过 Adapter/宿主桥接层集中管理，Vue 组件不直接操作 WPS 宿主对象。

### 2. 文档扫描与结构识别

完成段落、表格、节、嵌入对象扫描，以及主标题、副标题、1～9 级标题、正文、附件、表题、图题等角色识别。支持置信度、冲突仲裁、人工覆写、同段标题范围和文档定位。

### 3. 模板与排版引擎

完成多套内置预置模板、自定义模板、本地 JSON 持久化、动态多级标题体系、中西文字体分离、段落格式、页面设置、表格排版和大纲级别处理。

内置“党政机关公文”模板参考 GB/T 9704-2012 等公开规范要求设计，不代表获得官方认证或授权。

### 4. 安全链路

完成：

```text
物理备份
→ DJB2 文本签名
→ WPS UndoRecord
→ 内存 Snapshot
→ 格式执行
→ 文本完整性校验
→ 失败回滚
```

物理备份保存在当前活动文档所在目录；用户配置和备份历史索引保存在当前用户 AppData 下。

### 5. V2.1：最小改动排版与 Dry Run

完成 Minimal Fix / Full Normalize 双策略、格式差异计划、Dry Run 预览、变更筛选、文档签名过期保护，以及仅写入实际差异属性的执行路径。

### 6. V2.2：页眉页脚页码与目录

完成页眉、页脚、原生页码、多 Section 处理，以及 TOC 检测、插入、更新、删除和多级目录支持。

### 7. V2.3：文档清理与结构体检

完成空格、空行、Tab、手工换行、分页/分节异常等清理扫描，以及标题层级、编号、孤立标题、题注关系等结构检查和多维健康评分。

### 8. V2.4：备份与环境诊断

完成同目录物理备份、BackupReadiness、备份历史，以及 WPS / FileSystem Capability Matrix。当前 WPS 12.0 实机环境已确认 `WriteFile` / `ReadFile` 和二进制读写链路可用；不兼容接口不会参与正式业务主链路。

### 9. 开源加固：v0.9.0-beta.1

公开发布前进行专门 hardening：

- 安装/卸载仅操作 `WpsWordFormatter` 自己的 `publish.xml` 节点。
- 生产 WPS Adapter 与 Mock Adapter 显式隔离。
- 清理个人路径、构建归档和可能泄露本机信息的日志输出。
- 增加第三方许可声明、Security / Contributing / Changelog。
- 增加 GitHub Actions：依赖安全审计、公开发布卫生检查、TypeScript、Vitest、生产构建。
- Release 改为预编译 ZIP + SHA-256；普通用户安装 Release 不需要 Node.js/npm。
- 项目对外定位由 Stable 1.0 调整为 Beta，等待更多真实环境反馈。

## 自动化验证

当前 CI 统一执行：

```text
npm ci
public-release hygiene check
npm audit --audit-level=high
npm run typecheck
npm test
npm run build
```

算法、规划、清理、结构体检、备份与诊断使用自动化测试；WPS Writer JSAPI 的完整行为仍以 Windows + WPS Writer 实机验收为最终依据。

## 发布原则

只有在以下条件同时满足后才发布 Beta：

1. CI 全绿；
2. 当前源码树通过公开发布卫生检查；
3. 高危/严重依赖安全审计通过；
4. Windows + WPS Writer 12.0 完成 clean install → format → backup → restart/persistence → uninstall 验收；
5. 公开前完成或确认 Git 历史敏感信息清理策略。
