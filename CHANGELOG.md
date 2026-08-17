# Changelog

All notable changes to this project will be documented here.

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
