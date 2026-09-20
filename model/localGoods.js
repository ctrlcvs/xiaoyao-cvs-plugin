// 本地商品配置（2026-09-20 由助理添加）
// 背景：米游社已下架 shopwindow/shopwindow/fetchGoods 接口（实测返回 "unknown method"、retcode -3），
//       原通过该接口远程获取商品档位的方式不可用，故改为本地静态配置。
// 数据来源：米哈游官方商品配置文件（ProductIdConfigData / ProductCardDetailConfigData / PriceTierConfigData）。
// 维护提示：官方调整档位或价格时需同步本文件；price 单位为分（600 = 6 元）；数组下标即【#商品列表】显示的商品ID。
export default [
	// 商品ID 0
	{
		goods_id: "ys_chn_primogem1ststall_tier1",
		goods_name: "创世结晶",
		goods_unit: "60",
		price: "600",
		tier_id: "Tier_1",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2022/09/07/0f362595da2e37a7a8fde1bb120656d2_594155779359709441.png"
	},
	// 商品ID 1
	{
		goods_id: "ys_chn_primogem2ndstall_tier5",
		goods_name: "创世结晶",
		goods_unit: "300",
		price: "3000",
		tier_id: "Tier_5",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2022/09/07/830e247bb0cfffa5c74a04e79c0040f5_1814106121630644354.png"
	},
	// 商品ID 2
	{
		goods_id: "ys_chn_primogem3rdstall_tier15",
		goods_name: "创世结晶",
		goods_unit: "980",
		price: "9800",
		tier_id: "Tier_15",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2022/09/07/dfefc92ce56e3b5615ef28d6b1119b8b_5835214000384994274.png"
	},
	// 商品ID 3
	{
		goods_id: "ys_chn_primogem4thstall_tier30",
		goods_name: "创世结晶",
		goods_unit: "1980",
		price: "19800",
		tier_id: "Tier_30",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2022/09/07/e918ecfedcb13113eb627fd944199272_3460055016813877022.png"
	},
	// 商品ID 4
	{
		goods_id: "ys_chn_primogem5thstall_tier50",
		goods_name: "创世结晶",
		goods_unit: "3280",
		price: "32800",
		tier_id: "Tier_50",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2022/09/07/70e703a64e8786390ab8b7cdc35dbeeb_6358952826545947027.png"
	},
	// 商品ID 5
	{
		goods_id: "ys_chn_primogem6thstall_tier60",
		goods_name: "创世结晶",
		goods_unit: "6480",
		price: "64800",
		tier_id: "Tier_60",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2022/09/07/24fa6b6190ce5da6928e431a832d85c3_5932007685099741224.png"
	},
	// 商品ID 6
	{
		goods_id: "ys_chn_blessofmoon_tier5",
		goods_name: "空月祝福",
		goods_unit: "1",
		price: "3000",
		tier_id: "Tier_5",
		goods_icon: "https://uploadstatic.mihoyo.com/payment-center/2020/06/08/2da77803b9b2ffc2a2b763a59e9c125f_5219067706372136934.png"
	}
]
