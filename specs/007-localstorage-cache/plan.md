# Implementation Plan: 浏览器本地缓存

**Branch**: `007-localstorage-cache` | **Date**: 2025-01-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-localstorage-cache/spec.md`

## Summary

实现浏览器端本地缓存功能，包括：
1. 记住用户上次选中的数据库连接，下次访问自动选中
2. 缓存已获取的表列表数据，减少 API 调用
3. 缓存已加载的表字段详情
4. 强制刷新时击穿缓存

技术方案：使用 localStorage 作为缓存存储，创建统一的缓存服务层处理读写和版本兼容。

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React 18+, Ant Design 5.x  
**Storage**: localStorage (浏览器原生 API)  
**Testing**: Vitest (单元测试), Playwright (E2E 测试)  
**Target Platform**: 现代浏览器 (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web 应用 (frontend-only 变更)  
**Performance Goals**: 缓存读取 < 10ms，不阻塞 UI 渲染  
**Constraints**: localStorage 限制约 5-10MB，需优雅降级处理不可用情况  
**Scale/Scope**: 单用户单标签页使用场景

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|-----|------|-----|
| I. Ergonomic Python Backend | ✅ N/A | 本功能仅涉及前端 |
| II. TypeScript Frontend | ✅ Pass | 所有代码使用 TypeScript |
| III. Strict Type Annotations | ✅ Pass | 缓存数据结构有完整类型定义 |
| IV. Pydantic Data Models | ✅ N/A | 本功能无后端变更 |
| V. Open Access | ✅ Pass | 无认证相关变更 |
| VI. Comprehensive Testing | ✅ Plan | 需添加单元测试和 E2E 测试 |

**所有 Gate 通过，无违规项。**

## Project Structure

### Documentation (this feature)

```text
specs/007-localstorage-cache/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── services/
│   │   └── storage.ts        # 新增：localStorage 缓存服务
│   ├── contexts/
│   │   └── DatabaseContext.tsx  # 修改：集成缓存逻辑
│   ├── pages/
│   │   └── query/
│   │       └── index.tsx     # 修改：使用缓存的表列表
│   └── types/
│       └── storage.ts        # 新增：缓存数据类型定义
└── tests/
    └── services/
        └── storage.test.ts   # 新增：缓存服务单元测试
```

**Structure Decision**: 创建独立的 `storage.ts` 服务封装所有 localStorage 操作，保持关注点分离。修改现有的 `DatabaseContext` 和 `QueryPage` 集成缓存逻辑。

## Complexity Tracking

> 无违规项，无需记录复杂度权衡。
