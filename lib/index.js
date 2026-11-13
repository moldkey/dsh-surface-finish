/**
 * dsh-surface-finish — 表面处理选型与工艺参数
 */

export const name = "dsh-surface-finish";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

const FINISHES = {
  anodizing: { name: "阳极氧化", base: "铝", thickness: "5–25 µm", colors: "透明/黑/银/彩色", cost: 1.2, note: "耐磨耐蚀，可染色；硬质氧化 25–50µm" },
  "powder-coating": { name: "粉末喷涂", base: "钢/铝", thickness: "60–120 µm", colors: "任意 RAL", cost: 1.0, note: "外观好，耐候；需前处理" },
  electroplating: { name: "电镀（锌/镍/铬）", base: "钢", thickness: "5–30 µm", colors: "锌白/彩锌/镍/铬", cost: 1.3, note: "防腐；氢脆风险需去氢" },
  passivation: { name: "钝化", base: "不锈钢", thickness: "纳米级", colors: "本色", cost: 0.8, note: "去除游离铁，提升耐蚀" },
  painting: { name: "喷漆", base: "金属/塑料", thickness: "20–60 µm", colors: "任意", cost: 0.9, note: "成本低，耐久性一般" },
  "electrophoresis": { name: "电泳", base: "钢/铝", thickness: "15–30 µm", colors: "黑/灰", cost: 1.1, note: "覆盖均匀，适合复杂件" },
};

function n(v, d) { const x = Number(v); return Number.isFinite(x) ? x : d; }

const TOOLS = {
  finish_process: {
    description: "表面处理工艺：按工艺给厚度、颜色、适用基材与成本指数",
    parameters: {
      type: "object", additionalProperties: false,
      properties: { process: { type: "string", enum: ["anodizing", "powder-coating", "electroplating", "passivation", "painting", "electrophoresis"], description: "工艺" } },
      required: ["process"],
    },
    run(args) {
      const p = FINISHES[String(args.process || "").toLowerCase()];
      if (!p) throw new Error("支持: " + Object.keys(FINISHES).join(" / "));
      return ["表面处理", "=".repeat(52), "工艺: " + p.name, "适用基材: " + p.base, "膜厚: " + p.thickness,
        "颜色: " + p.colors, "成本指数: " + p.cost, "说明: " + p.note, "", "更多工具：" + SITE].join(NL);
    },
  },
  finish_select: {
    description: "表面处理选型：按基材与耐蚀/耐磨/外观/导电要求推荐工艺",
    parameters: {
      type: "object", additionalProperties: false,
      properties: {
        base: { type: "string", enum: ["aluminum", "steel", "stainless", "plastic"], description: "基材" },
        corrosion: { type: "boolean", description: "耐蚀要求" },
        wear: { type: "boolean", description: "耐磨要求" },
        appearance: { type: "boolean", description: "外观要求" },
        conductive: { type: "boolean", description: "需导电" },
      },
      required: ["base"],
    },
    run(args) {
      const b = String(args.base || "aluminum");
      const corr = String(args.corrosion || "") === "true";
      const wear = String(args.wear || "") === "true";
      const app = String(args.appearance || "") === "true";
      const cond = String(args.conductive || "") === "true";
      const recs = [];
      if (b === "aluminum") {
        if (cond) recs.push(["anodizing", "局部遮蔽保证导电"]);
        else recs.push(["anodizing", "耐蚀+外观"]);
        if (app) recs.push(["powder-coating", "颜色丰富"]);
      } else if (b === "steel") {
        recs.push(["electroplating", wear ? "镀镍/铬耐磨" : "镀锌防腐"]);
        if (app) recs.push(["powder-coating", "外观+耐候"]);
        if (!app && !wear) recs.push(["electrophoresis", "复杂件均匀覆盖"]);
      } else if (b === "stainless") {
        recs.push(["passivation", corr ? "提升耐蚀" : "常规清洁"]);
        if (app) recs.push(["painting", "改色"]);
      } else {
        recs.push(["painting", "塑料常用"]);
      }
      const lines = ["表面处理选型", "=".repeat(52), "基材: " + b, ""];
      recs.slice(0, 4).forEach((r) => {
        const f = FINISHES[r[0]];
        lines.push("- " + f.name + "（" + f.thickness + "）：" + r[1] + "；成本 " + f.cost);
      });
      lines.push("");
      lines.push("选择需结合使用环境、装配配合与成本；膜厚会影响尺寸，需预留。");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
};

export function apply(ctx, config) {
  void config;
  for (const name of Object.keys(TOOLS)) {
    const t = TOOLS[name];
    ctx.tools.register({
      name: name,
      description: t.description,
      parameters: t.parameters,
      output: TEXT_OUTPUT,
      async execute(args) { try { return { text: t.run(args || {}) }; } catch (e) { return { text: "处理失败: " + String((e && e.message) || e) }; } },
    });
  }
}
