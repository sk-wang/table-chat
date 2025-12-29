# 导出功能

> ⚠️ 本文件已废弃，请查看正式的规格文档：
> 
> - **规格说明**: [`specs/010-query-export/spec.md`](./specs/010-query-export/spec.md)
> - **实现计划**: [`specs/010-query-export/plan.md`](./specs/010-query-export/plan.md)
> - **任务清单**: [`specs/010-query-export/tasks.md`](./specs/010-query-export/tasks.md)
> - **数据模型**: [`specs/010-query-export/data-model.md`](./specs/010-query-export/data-model.md)
> - **需求清单**: [`specs/010-query-export/checklists/requirements.md`](./specs/010-query-export/checklists/requirements.md)

## 快速概览

添加查询结果导出功能，支持将 SQL 查询结果导出为 CSV、JSON 和 XLSX 格式文件。

### 导出格式

| 格式 | 适用场景 | 说明 |
|------|----------|------|
| CSV | Excel 分析、数据处理 | 逗号分隔，UTF-8 编码，首行为列名 |
| JSON | API 对接、程序处理 | 数组格式，每行一个对象 |
| XLSX | Excel 高级功能 | 标准 Excel 格式 |

### 用户交互方式

1. **工具栏按钮**: 在查询结果表格上方的「导出」下拉按钮
2. **自然语言触发**: 在自然语言中指定导出格式，自动执行并导出

### 文件命名规则

```
{数据库名}_{时间戳}.{格式}
示例：mydb_20251229_153000.csv
```
