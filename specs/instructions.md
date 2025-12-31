#instructions

## constitution

- 后端使用 Ergonomic Python 风格来编写代码，前端使用 typescript
- 前后端都要有严格的类型标注
- 使用 pydantic 来定义数据模型
- 所有后端生成的JSON 数据，使用 camelCase 格式。
- 不需要 authentication，任何用户都可以使用。

## 基本思路

这是一个数据库查询工具，用户可以添加一个 db url，系统会连接到数据库，获取数据库的 metadta，然后将数据库中的table 和 view 的信息展示出来，然后用户可以自己输入sql 查询，也可以通过自然语言来生成 sql 查询。


基本想法

- 数据库连接字符串和数据库的 metadata 都会存储到 sqlite 数据库中。我们可以根据 postgres 的功能来查询系统中的表和视图的信息，然后用 LLM 来将这些信息转换成 json 格式，然后存储到 sqlite 数据库中。这个信息以后可以复用。
- 当用户使用 LLM 来生成 sql 查询时，我们可以把系统中的表和视图的信息作为 context 传递给 LLM，然后 LLM 会根据这些信息来生成sqL查询。
- 任何输入的 sql 语句，都需要经过 sqlparser 解析，确保语法正确，并且仅包含 select 语句。如果语法不正确，需要给出错误信息。
- 如果查询不包含 Limit 子句，则默认添加 limit 1000 子句。
- 输出格式是 json，前端将其组织成表格，并显示出来。

后端使用 Python （uv） / FastAPI / sqlglot / openai sdk 来实现。
前端使用 React / refine 5 / tailwind / ant design 来实现。sql editor 使用 monaco editor 来实现。/ 页面视觉风格参考jetbrains的ide风格

OpenAI API 的base url和key在环境变量OPENAI_BASE_URL和OPENAI_API_KEY 中。
数据库连接和metadata 存储在sqlite数据库中，放在当前目录的scinew.db里面

后端API需要支持cors，允许所有origin.
大致API 如下：

```bash

# 获取所有已存储的数据库
GET /api/v1/dbs
# 添加一个数据库
PUT /api/v1/dbs/{name}

{
    "url":"postgresql://postgres:postgres@localhost:5432/postgres"
}

# 获取一个数据库的 metadata
GET /api/v1/dbs/{name}

# 查询某个数据库的信息
POST /api/v1/dbs/{name}/query
{
    "sql":"select * from table1"
}

# 根据自然语言生成sql

POST /api/v1/dbs/{name}/query/natural
{
    "prompt":"show me all the tables in this database"
}
```

## 侧边栏
侧边栏目前用途不大，可以放所有已有的数据库，并且把添加数据库，删除已有数据库的功能放在侧边栏，侧边栏也要使用jetbrains ide的风格。然后主页直接显示第一个数据库的metadata信息和查询界面，这样用户可以减少一次点击进入到database display页面。一个页面囊括所有功能。


## 分析代码
/speckit.analyze 仔细review 当前代码库的代码，删除不用的代码，添加更多unit test，以及寻找opportunity

## 注释
字段注释和表注释，要在合适的地方显示，比如查询结构，表结构树中。效果类似阿里云DMS，查询结果中直接显示注释，列宽可拉拽

## 搜索表
一个库的表可能有几百张，需要有个搜索表功能

## 添加MySQL db支持
参考backend中的postgresSQL实现，实现Mysql的metadata提取和查询支持，同时自然语言生成也支持MySQL.目前我本地有一个mysql库连接字符串是 mysql://root:123456@localhost:3306/scinew。由于之前实现只考虑了postgre，在新实现mysql的功能时，要注意SOLID原则，必要时进行代码的重构。


## 导出功能
功能要求

导出格式支持：用户可以将查询结果导出为至少两种格式（例如：CSV 文件、JSON 文件）。
自动化流程：利用 Claude Code 的 Agent 或自定义 Command 功能，尝试设计一个自动化步骤，使得“执行查询”和“导出结果”可以一键完成或通过一个简单的命令触发。
用户交互：思考如何通过自然语言或简单的界面操作来触发导出功能（例如，在查询后，AI 助手可以主动询问：“需要将这次查询结果导出为 CSV 或 JSON 文件吗？”）。

核心练习点

代码库理解与扩展：使用 AI 工具快速理解自己编写的代码，并找到合适的切入点添加新功能。
AI Agent 任务分解：在 Claude Code 中，尝试将“导出数据”这个复杂任务分解为“获取查询结果”、“格式化数据”、“创建文件”等子任务，并观察 Agent 如何协调处理。
工具链整合：思考 Cursor 在快速迭代和代码生成上的优势，与 Claude Code 在多步骤自动化上的优势，如何在本项目中结合使用。

提交物

更新后的“智能数据库查询工具”项目代码。
一个名为 FEATURE_EXPORT.md 的文档，内容包括：新增功能的设计思路。

## 支持关闭SSL


## 优化TEXT2SQL
现在208有3000多个表，一次性把所有metadata给过去不可用，得搞个提示链，先选表，再把字段给过去，生成sql

## 增加SQL执行记录日志
需要有一个执行记录查询的功能，方便回顾过去执行的SQL记录，主要就是记录执行的SQL，返回的条数，执行的时间；如果是自然语言生成的话还要记录对应的自然语言。执行记录的日志支持搜索SQL内容，所以要加上全文索引。用sqlite的fts最佳实践来做，因为sqlite不支持中文分词所以要引入jieba分词，存储分词后的自然语言查询。查询执行记录。参考阿里云dms [image copy 2.png]

## SQL查询结果的优化
查询结果和SQL编辑器中间做一个可调节这两个部分比例的滑块，并且把上次调整的位置记录到localstorage里面去。

## 支持SSH
需要支持OVER SSH，以访问一些不能直连的数据库

## 利用claude code sdk完成sql的生成
把现在的自然语言的功能叫做普通模式，保留，再加一个agent模式，可以在普通模式和agent模式之间切换切换的。agent模式采用claude code sdk，来实现一个agent，配置是这俩：(export ANTHROPIC_BASE_URL="http://localhost:3000/api"
export ANTHROPIC_AUTH_TOKEN="cr_f750d122c1827568ff5899ba947d512a5381285a8d80ce76aa98c6873011561a") 
给他提供一个查询sql的工具，这个工具不能执行删更改和DDL的操作。能用这个工具探索数据库，给出对应的sql。前端的展示模仿claude code vscode插件那种交互方式，但是可以简化一点，因为我们只有生成sql这一个功能。

UI 布局方案，应该是和自然语言做一个同级的选项卡agent，然后执行的不只是select，还有一些describe之类的探索表结构的命令。最后根据意图生成的可以是select以外的sql，比如创建索引类的，我可以在其他工具里执行。


## 编写dockerfile和docker-compose文件
使得程序能靠docker一键启动，方便使用

## 增加收藏sql的功能
方便人检索，方便大模型召回，快速学习经验

## 写一个github吸引眼球的readme文件
重点体现 AI Agent的功能，然后部署只写docker，readme里面不写其他部署模式了。

## 自动保存记忆
对于明确指出问题的意图时，总结fact和narrative到记忆中，在调取ai agent的时候自动带上这些记忆。