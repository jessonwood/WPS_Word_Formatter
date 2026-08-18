# Changelog

All notable changes to this project will be documented here.

## [1.0.2] - Unreleased

### Fixed
- 修复表格标题附近结构段被清理后，WPS 可能将独立的“表1 ……”标题吸入表格首行/首单元格的问题。
- 表格扫描阶段标记表格内部段落，并记录表格前后直接相邻的结构段落。
- 清理扫描器与清理执行器双重保护表格内部段落、表格前后结构锚点，禁止删除或改写这些段落。

### Changed
- 自动排版不再执行任何自动清理：所有清理项统一标记为 `safeAutoFix: false`，仅允许用户进入“文档清理”后显式确认执行。
- 连续空格、段首/段尾空格、普通空行等仍可被检测并提示，但不会随着“一键排版”自动修改文档文本。
- 新增表格边界与手动清理策略回归测试。

## [1.0.1] - 2026-08-17

### Fixed
- 新增“第×条 + 空格 + 正文”的同段二级标题识别，空格作为标题与正文边界保留。
- 最小修复模式支持同段二级标题：整段按正文做最小修复，仅标题 Range 套用二级标题格式。
- “第一章 总则”“第一条 正文”等单个内部空格不再被文档清理误删。
- 连续多个内部半角/全角空格仅压缩为 1 个，不再压缩为 0 个。
- 一键整理并排版的 safeAutoFix 同步遵循上述空格保护规则。

## [1.0.0] - 2026-08-17

### Added
- 离线模板智能推荐：根据标题编号、章节结构与文档关键词推荐最合适的内置模板。
- 标题编号连续性、重复编号与标题层级跳级检查在结构体检中集中呈现。
- 一键整理并排版：优先执行安全清理项，再进入备份、排版与完整性校验。
- 从当前文档提取自定义模板：复用已识别的主标题、多级标题、正文与页面样式。

### Changed
- 首页默认流程简化为模板/推荐、扫描、预览和一键排版；“更多设置”默认展开，排版策略与排版范围保持直接可见，目录等高级选项仍可手动收起。
- WPS 生产适配路径不再允许 synthetic/mock 文档兜底；浏览器预览只使用独立 MockWriterAdapter。
- 版本正式进入 v1.0.0。

## [0.9.0-beta.2] - 2026-08-17

### Added
- 新增“普通公文（2025）”内置模板。
- 新增“规章制度（2025）”内置模板。
- 新增“业务操作（2025）”内置模板。
- 三套模板增加对应的五级标题编号识别规则与单元测试。

### Changed
- 根据《公文处理规范（2025年版）》照片配置标题、正文、表格标题、表格内容与附件样式。
- 当前已验证宿主基线保持为 Windows x64 + WPS 文字 11.8.2.12094。

## [0.9.0-beta.1] - 2026-08-16

### Added
- GitHub Actions CI for type checking, unit tests, and production builds.
- Security and contribution policies.
- Third-party attribution documentation.

### Changed
- Public compatibility statement now reflects the actually validated environment: Windows x64 + WPS 文字 11.8.2.12094.
- Offline installer updates only the `WpsWordFormatter` node in WPS `publish.xml` and preserves other add-ins.
- Offline uninstaller removes only this add-in registration and files while preserving other WPS add-ins and user data.
- Release positioning changed from stable `1.0.0` to `0.9.0-beta.1` pending broader real-world validation.

### Removed
- Tracked `.7z` release artifact from the source tree; release binaries should be attached to GitHub Releases instead.

### Known beta limitations
- Real-host validation is concentrated on Windows x64 + WPS 文字 11.8.2.12094.
- macOS, Linux, older WPS versions, and WPS 365 variants are not yet claimed as verified.
- Final clean-install / format / backup / uninstall acceptance requires a real WPS Writer host and cannot be proven by CI alone.
