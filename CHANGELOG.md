# Changelog

All notable changes to this project will be documented here.

## [0.9.0-beta.1] - 2026-08-16

### Added
- GitHub Actions CI for type checking, unit tests, and production builds.
- Security and contribution policies.
- Third-party attribution documentation.

### Changed
- Public compatibility statement now reflects the actually validated environment: Windows + WPS Writer 12.0.
- Offline installer updates only the `WpsWordFormatter` node in WPS `publish.xml` and preserves other add-ins.
- Offline uninstaller removes only this add-in registration and files while preserving other WPS add-ins and user data.
- Release positioning changed from stable `1.0.0` to `0.9.0-beta.1` pending broader real-world validation.

### Removed
- Tracked `.7z` release artifact from the source tree; release binaries should be attached to GitHub Releases instead.

### Known beta limitations
- Real-host validation is concentrated on Windows x64 + WPS Writer 12.0.
- macOS, Linux, older WPS versions, and WPS 365 variants are not yet claimed as verified.
- Final clean-install / format / backup / uninstall acceptance requires a real WPS Writer host and cannot be proven by CI alone.
