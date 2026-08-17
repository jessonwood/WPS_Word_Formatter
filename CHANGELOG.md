# Changelog

All notable changes to this project will be documented here.

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
