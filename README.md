# pi-timelog

[Pi](https://github.com/earendil-works/pi) 编码代理的扩展：每轮对话结束后，在末尾显示一行时间戳。

## 效果

```
⏱ 03:26:31 → 03:35:58 · 9m26s
```

- 左边：你提问的时刻
- 右边：本轮回答完成的时刻
- `· 9m26s`：本轮总用时（可关闭）

时间戳仅用于界面显示，**不进入模型上下文**；中间过程消息不再逐条显示时间。

## 安装

```bash
pi install git:github.com/tutu359/pi-timelog
```

## 更新

```bash
pi update --extensions
```

## 配置

编辑 `extensions/timelog/index.ts` 顶部的 `CONFIG`：

| 选项 | 默认 | 说明 |
|---|---|---|
| `showSeconds` | `true` | 显示到秒；`false` 则只显示 `HH:MM` |
| `showDuration` | `true` | 行尾追加总用时 |

改完运行 `/reload` 生效。

## License

MIT
