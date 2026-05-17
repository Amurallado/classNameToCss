# Change Log

## [1.2.2] - 2026-05-17

### Fixed

- **Security**: Fixed path traversal vulnerabilities in `src/completion.ts`, `src/diagnostics.ts`, and `src/test/index.ts` by sanitizing file paths.
- **Security**: Prevented "Object Injection Sink" vulnerability in `src/diagnostics.ts` by refactoring dynamic property access.
- **Security**: Updated dependencies to resolve several critical and high-severity vulnerabilities (CVE-2025-59343 in `tar-fs`, and vulnerabilities in `serialize-javascript`, and `diff`).
- Fixed TypeScript configuration to include missing node and mocha types.
- Fixed a bug in the test mock for `vscode.TextDocument.getText` that caused failures when using ranges.

### Changed

- **Modernized**: Updated all core development tools (TypeScript 6.0.3, ESLint 10.4.0, Mocha 11.7.5, Esbuild 0.28.0).
- **pnpm v11**: Migrated configuration to `pnpm-workspace.yaml` for compatibility with pnpm v11.

## [1.1.1] - 2025-09-07

### Fixed

- Update media in README and clear files unused

## [1.1.0] - 2025-09-04

### Fixed

- No longer incorrectly treats color values (e.g., `#fff`) and decimal numbers (e.g., `.4rem`) as class or ID selectors.

### Added

- Added support for PHP files.
- Completions for selectors already defined in the current file are now excluded to reduce redundancy.
- Added a comprehensive unit test suite for core functionality.

### Changed

- Optimized file scanning with debouncing and caching to improve performance, especially in large projects (`src/completion.ts`, `src/diagnostics.ts`, `src/utils.ts`).
- Improved detection of CSS property values to be multi-line aware and recognize `var()` functions (`src/utils.ts`).
- The internal file watcher now dynamically uses the project's configuration (`src/extension.ts`).

## [1.0.0] - 2025-08-05

### Added

- Caching mechanism for improved performance.
- File watcher to automatically update the cache.
- Configuration option to customize the file extensions to scan.
- Configuration option to specify source files for class name extraction.

### Changed

- Updated all dependencies to their latest versions.
- Modernized the testing framework to use `@vscode/test-electron`.
- Improved regular expressions for more accurate parsing.
- Updated `tsconfig.json` to use a more modern ECMAScript target.

### Fixed

- Addressed security vulnerabilities.
- Fixed issues with class name extraction in certain edge cases.
- Resolved performance issues with large files.
- modify extension name from `className Completion in CSS` to `CSS Selector Support`

### Removed

- Removed the deprecated `vscode` package.

## [0.0.7] - 2023-03-09

### Fixed

- support Windows

## [0.0.6] - 2021-08-17

### Fixed

- support single quotes className
- support multi file className

## [0.0.5] - 2021-03-13

### Changed

- upgrade `typescript`
- `tslint` to `eslint`

## [0.0.4] - 2020-02-22

### Added

- support multi class name, such as `class="name1 name2"`

## [0.0.3] - 2019-06-03

### Fixed

- ensure work when only type dot
- remove duplicate elements from the proposal
- modify extension name from `className To Css` to `className Completion in CSS`

## [0.0.2] - 2019-05-28

### Added

- support vue

## [0.0.1] - 2019-05-21

### Init

- support htm/html/jsx/tsx

[1.0.0]: https://github.com/your-username/your-repo/releases/tag/1.0.0
[0.0.7]: https://github.com/zitup/classNameToCss/releases/tag/0.0.7
[0.0.6]: https://github.com/zytjs/classNameToCss/releases/tag/0.0.6
[0.0.5]: https://github.com/zytjs/classNameToCss/releases/tag/0.0.5
[0.0.4]: https://github.com/zytjs/classNameToCss/releases/tag/0.0.4
[0.0.3]: https://github.com/zytjs/classNameToCss/releases/tag/0.0.3
[0.0.2]: https://github.com/zytjs/classNameToCss/releases/tag/0.0.2
[0.0.1]: https://github.com/zytjs/classNameToCss/releases/tag/0.0.1
