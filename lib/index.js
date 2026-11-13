/**
 * dsh-packing-list — 出口装箱单生成与校验
 */

export const name = "dsh-packing-list";

export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";

const TEXT_OUTPUT = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

function n(v, d) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function f(x) {
  return (Math.round(x * 100) / 100).toString();
}

function parseItems(text) {
  let arr;
  try {
    arr = JSON.parse(text);
  } catch (e) {
    throw new Error("items 需要 JSON 数组，如 [{\"name\":\"螺栓\",\"qty\":1000,\"weight_kg\":12,\"length_cm\":40,\"width_cm\":30,\"height_cm\":25}]");
  }
  if (!Array.isArray(arr) || !arr.length) throw new Error("items 不能为空数组");
  return arr.map((it, i) => {
    const o = {
      name: String(it.name || "item-" + (i + 1)),
      qty: n(it.qty, 1),
      weight: n(it.weight_kg, 0),
      l: n(it.length_cm, 0),
      w: n(it.width_cm, 0),
      h: n(it.height_cm, 0),
    };
    o.volume = (o.l * o.w * o.h) / 1000;
    return o;
  });
}

const TOOLS = {
  packing_list_generate: {
    description: "生成出口装箱单：按重量/体积估算箱数，输出各箱明细与合计",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: { type: "string", description: "JSON 数组：name, qty, weight_kg, length_cm, width_cm, height_cm" },
        max_weight_kg: { type: "number", description: "单箱限重，默认 20" },
        max_volume_l: { type: "number", description: "单箱限体积（升），默认 60" },
      },
      required: ["items"],
    },
    run(args) {
      const items = parseItems(args.items || "[]");
      const maxW = n(args.max_weight_kg, 20);
      const maxV = n(args.max_volume_l, 60);
      const totalW = items.reduce((a, b) => a + b.weight, 0);
      const totalV = items.reduce((a, b) => a + b.volume, 0);
      const byW = Math.ceil(totalW / maxW);
      const byV = Math.ceil(totalV / maxV);
      const boxes = Math.max(1, byW, byV);
      const lines = ["出口装箱单（估算）", "=".repeat(52), "品名 | 数量 | 单件重(kg) | 体积(L)"];
      for (const it of items) lines.push(it.name + " | " + f(it.qty) + " | " + f(it.weight) + " | " + f(it.volume));
      lines.push("");
      lines.push("合计重量: " + f(totalW) + " kg");
      lines.push("合计体积: " + f(totalV) + " L（" + f(totalV / 1000) + " m³）");
      lines.push("按重量箱数: " + byW + "；按体积箱数: " + byV);
      lines.push("建议箱数: " + boxes);
      lines.push("平均每箱: " + f(totalW / boxes) + " kg / " + f(totalV / boxes) + " L");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
  packing_list_check: {
    description: "校验装箱单：毛重/体积/件数一致性，给出体积重与计费重提示",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cartons: { type: "string", description: "JSON 数组：count, gross_weight_kg, length_cm, width_cm, height_cm" },
        mode: { type: "string", enum: ["air", "sea"], description: "运输方式，默认 air" },
      },
      required: ["cartons"],
    },
    run(args) {
      let arr;
      try { arr = JSON.parse(args.cartons || "[]"); } catch (e) { throw new Error("cartons 需要 JSON 数组"); }
      if (!Array.isArray(arr) || !arr.length) throw new Error("cartons 不能为空");
      const mode = String(args.mode || "air") === "sea" ? "sea" : "air";
      let count = 0, gross = 0, vol = 0;
      const lines = ["装箱单校验", "=".repeat(52)];
      for (const c of arr) {
        const k = n(c.count, 1);
        const gw = n(c.gross_weight_kg, 0);
        const v = (n(c.length_cm, 0) * n(c.width_cm, 0) * n(c.height_cm, 0)) / 1000;
        count += k; gross += gw; vol += v * k;
        lines.push("箱型: " + k + " 件, 毛重 " + f(gw) + " kg, 体积 " + f(v) + " L");
        if (gw <= 0) lines.push("  提醒: 毛重未填");
        if (v <= 0) lines.push("  提醒: 尺寸未填");
      }
      const vw = vol / 6000 * 1000;
      const chargeable = mode === "air" ? Math.max(gross, vol / 6) : Math.max(gross, vol / 1000);
      lines.push("");
      lines.push("总件数: " + count);
      lines.push("总毛重: " + f(gross) + " kg");
      lines.push("总体积: " + f(vol) + " L");
      lines.push((mode === "air" ? "空运体积重(÷6000): " : "海运计费体积(m³): ") + f(mode === "air" ? vol / 6 : vol / 1000));
      lines.push("计费重: " + f(chargeable));
      lines.push("");
      lines.push("说明：空运体积重按 cm³/6000，海运按 m³ 与毛重取大；实际以承运人规则为准。");
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
      async execute(args) {
        try {
          return { text: t.run(args || {}) };
        } catch (e) {
          return { text: "处理失败: " + String((e && e.message) || e) };
        }
      },
    });
  }
}
