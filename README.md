<p align="center"><strong>dsh-packing-list — 出口装箱单生成与校验</strong></p>

按重量和体积估算箱数，生成装箱单；也能校验毛重/体积/件数并算体积重与计费重。

## 安装

    dsh plugin --profile web add github:moldkey/dsh-packing-list

## 两个工具

- `packing_list_generate`：items JSON → 箱数、每箱均重/均体、合计
- `packing_list_check`：cartons JSON → 体积重、计费重（空运/海运）

## 示例

    items = [{"name":"螺栓","qty":1000,"weight_kg":12,"length_cm":40,"width_cm":30,"height_cm":25}]

## 说明

空运体积重按 cm³/6000，海运按 m³ 与毛重取大；实际以承运人规则为准。

更多工具：https://deepseekbase.com/zh/tools/

## 许可

MIT
