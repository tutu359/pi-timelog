/**
 * timelog — 每轮对话结束时显示一行时间戳
 *
 * 一个回合（turn）结束后写入一条 TUI-only custom entry，
 * 渲染为 `⏱ HH:MM:SS → HH:MM:SS · XmXs`（提问时刻 → 回答完成时刻 · 总用时）。
 * 不进入 LLM 上下文，中间过程消息不逐条显示。
 */

const CUSTOM_TYPE = "message-timestamps";

/** ===== 可定制配置 ===== */
const CONFIG = {
	/** 时间显示到秒（false = 只显示 HH:MM，更紧凑） */
	showSeconds: true,
	/** 行尾追加本轮总用时，如 "· 9m26s" */
	showDuration: true,
};

function fmtTime(ms: number): string {
	const d = new Date(ms);
	const p = (n: number) => String(n).padStart(2, "0");
	const base = `${p(d.getHours())}:${p(d.getMinutes())}`;
	return CONFIG.showSeconds ? `${base}:${p(d.getSeconds())}` : base;
}

function fmtDur(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const m = Math.floor(ms / 60_000);
	const s = Math.round((ms % 60_000) / 1000);
	return `${m}m${s}s`;
}

export default function (pi: any) {
	pi.registerEntryRenderer(CUSTOM_TYPE, (entry: any, _opts: any, theme: any) => {
		const d = entry.data ?? {};

		// 新版：一轮一条，提问 → 完成（· 总用时）
		if (typeof d.questionMs === "number" && typeof d.endMs === "number") {
			const dur = CONFIG.showDuration ? ` · ${fmtDur(Math.max(0, d.endMs - d.questionMs))}` : "";
			return new (require("@earendil-works/pi-tui").Text)(
				theme.fg("dim", `⏱ ${fmtTime(d.questionMs)} → ${fmtTime(d.endMs)}${dur}`),
			);
		}

		// 旧版条目（本扩展早期版本的逐消息格式）：按原样式渲染，保证历史会话不空白
		const t = typeof d.ms === "number" ? d.ms : Date.parse(entry.timestamp) || Date.now();
		const role = d.role === "user" ? "user" : "ai";
		const dur = typeof d.durationMs === "number" && role === "ai" ? ` · ${fmtDur(d.durationMs)}` : "";
		return new (require("@earendil-works/pi-tui").Text)(
			theme.fg("dim", `⏱ ${fmtTime(t)} · ${role}${dur}`),
		);
	});

	// ---- 回合时间追踪 ----
	let questionMs: number | undefined; // 本轮用户提问时刻
	let lastEnd: number | undefined; // 本轮最后一条 assistant 消息完成时刻
	let lastEmittedEnd: number | undefined; // 防止收尾事件重复触发时输出重复行

	pi.on("message_end", async (_event: any, _ctx: any) => {
		const msg = _event?.message;
		if (!msg) return;
		if (msg.role === "user") {
			questionMs = typeof msg.timestamp === "number" ? msg.timestamp : Date.now();
			lastEnd = undefined;
			lastEmittedEnd = undefined;
		} else if (msg.role === "assistant") {
			lastEnd = Date.now();
		}
	});

	// agent_end：一次 agent 循环结束（消息已持久化，能挂到本轮最后一条消息后面）
	pi.on("agent_end", async (_event: any, _ctx: any) => {
		if (questionMs === undefined || lastEnd === undefined) return;
		if (lastEnd === lastEmittedEnd) return;
		pi.appendEntry(CUSTOM_TYPE, { questionMs, endMs: lastEnd });
		lastEmittedEnd = lastEnd;
	});
}
