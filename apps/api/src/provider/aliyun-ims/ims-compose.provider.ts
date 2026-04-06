import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ICE20201109, * as $ICE20201109 from '@alicloud/ice20201109';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';

export interface BatchComposeProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  submitBatchJob(inputConfig: any, editingConfig: any, outputConfig: any, callbackUrl?: string, callbackToken?: string): Promise<{ jobId: string }>;
  checkJobStatus(jobId: string): Promise<{ status: string; subJobs?: any[]; progress?: number }>;
  getEditingProject(projectId: string): Promise<EditingProjectSnapshot | null>;
}

export interface EditingProjectSnapshot {
  projectId: string;
  title?: string;
  status?: string;
  duration?: number;
  coverURL?: string;
  modifiedTime?: string;
  timeline?: any;
  timelineRaw?: string;
  timelineConvertStatus?: string;
  timelineConvertErrorMessage?: string;
}

// ========== 转场效果枚举（带中文名）==========
export const TRANSITION_LIST: { id: string; label: string }[] = [
  { id: 'directional', label: '方向移动' }, { id: 'displacement', label: '置换' },
  { id: 'windowslice', label: '窗口切片' }, { id: 'bowTieVertical', label: '垂直蝴蝶结' },
  { id: 'bowTieHorizontal', label: '水平蝴蝶结' }, { id: 'simplezoom', label: '简单缩放' },
  { id: 'linearblur', label: '线性模糊' }, { id: 'waterdrop', label: '水滴' },
  { id: 'glitchmemories', label: '故障回忆' }, { id: 'polka', label: '波尔卡圆点' },
  { id: 'perlin', label: '柏林噪声' }, { id: 'directionalwarp', label: '方向扭曲' },
  { id: 'bounce_up', label: '向上弹跳' }, { id: 'bounce_down', label: '向下弹跳' },
  { id: 'wiperight', label: '向右擦除' }, { id: 'wipeleft', label: '向左擦除' },
  { id: 'wipedown', label: '向下擦除' }, { id: 'wipeup', label: '向上擦除' },
  { id: 'morph', label: '变形' }, { id: 'colordistance', label: '色彩距离' },
  { id: 'circlecrop', label: '圆形裁切' }, { id: 'swirl', label: '漩涡' },
  { id: 'dreamy', label: '梦幻' }, { id: 'gridflip', label: '网格翻转' },
  { id: 'zoomincircles', label: '圆形缩放' }, { id: 'radial', label: '径向' },
  { id: 'mosaic', label: '马赛克' }, { id: 'undulatingburnout', label: '波浪燃烧' },
  { id: 'crosshatch', label: '交叉线' }, { id: 'crazyparametricfun', label: '参数曲线' },
  { id: 'kaleidoscope', label: '万花筒' }, { id: 'windowblinds', label: '百叶窗' },
  { id: 'hexagonalize', label: '六边形化' }, { id: 'glitchdisplace', label: '故障位移' },
  { id: 'dreamyzoom', label: '梦幻缩放' }, { id: 'doomscreentransition_up', label: '末日上移' },
  { id: 'doomscreentransition_down', label: '末日下移' }, { id: 'ripple', label: '涟漪' },
  { id: 'pinwheel', label: '风车' }, { id: 'angular', label: '角度' },
  { id: 'burn', label: '燃烧' }, { id: 'circle', label: '圆形' },
  { id: 'circleopen', label: '圆形展开' }, { id: 'colorphase', label: '色相变换' },
  { id: 'crosswarp', label: '交叉扭曲' }, { id: 'cube', label: '立方体' },
  { id: 'directionalwipe', label: '方向擦除' }, { id: 'doorway', label: '门廊' },
  { id: 'fade', label: '淡入淡出' }, { id: 'fadecolor', label: '颜色淡变' },
  { id: 'fadegrayscale', label: '灰度淡变' }, { id: 'flyeye', label: '复眼' },
  { id: 'heart', label: '爱心' }, { id: 'luma', label: '亮度' },
  { id: 'multiplyblend', label: '正片叠底' }, { id: 'pixelize', label: '像素化' },
  { id: 'polarfunction', label: '极坐标' }, { id: 'randomsquares', label: '随机方块' },
  { id: 'rotatescalefade', label: '旋转缩放淡出' }, { id: 'squareswire', label: '方块线条' },
  { id: 'squeeze', label: '挤压' }, { id: 'swap', label: '交换' },
  { id: 'wind', label: '风' },
];

// ========== 高级转场效果（付费）==========
// IDs must match official IMS SubType values for preview images to work
export const ADVANCED_TRANSITION_LIST: { id: string; label: string }[] = [
  // 运镜
  { id: 'OT0001-atom_camera_move2', label: '运镜II' },
  { id: 'OT0001-atom_move_blur1', label: '横移模糊1' },
  { id: 'OT0001-atom_horizontal_move_blur', label: '横移模糊2' },
  { id: 'OT0001-atom_memoirs_pull_screen1', label: '回忆拉屏1' },
  { id: 'OT0001-atom_memoirs_pull_screen2', label: '回忆拉屏2' },
  { id: 'OT0001-atom_memoirs_pull_screen3', label: '回忆拉屏3' },
  { id: 'OT0001-atom_zoom_in', label: '拉近' },
  { id: 'OT0001-atom_zoom_out', label: '拉远' },
  { id: 'OT0001-atom_down_glide', label: '下滑' },
  { id: 'OT0001-atom_shaking_camera', label: '镜头摇晃' },
  { id: 'OT0001-atom_space_rotation', label: '空间旋转' },
  { id: 'OT0001-atom_unlimited_wear1', label: '无限穿越1' },
  { id: 'OT0001-atom_unlimited_wear2', label: '无限穿越2' },
  { id: 'OT0001-atom_push_away2', label: '推远II' },
  { id: 'OT0001-atom_drag_down', label: '向下拖拽' },
  { id: 'OT0001-atom_turn_page', label: '翻页' },
  { id: 'OT0001-atom_melt_down', label: '融解' },
  { id: 'OT0001-atom_sector_shape', label: '扇形' },
  { id: 'OT0001-atom_side_segmentation', label: '两侧分割' },
  { id: 'OT0001-atom_flying_up', label: '向上飞出' },
  // 闪光/摇镜
  { id: 'OT0001-color_up', label: '颜色向上' },
  { id: 'OT0001-normal_pan', label: '普通摇镜' },
  { id: 'OT0001-dispersion_pan', label: '色散摇镜' },
  { id: 'OT0001-bounce_flash', label: '弹动闪光' },
  { id: 'OT0001-spin_flash', label: '旋转闪光' },
  { id: 'OT0001-jump_flash', label: '跳跃闪光' },
  { id: 'OT0001-shake_spin', label: '晃动旋转' },
  { id: 'OT0001-lower_left', label: '左下' },
  { id: 'OT0001-upper_right', label: '右上' },
  // 模糊/溶解
  { id: 'OT0001-jitter', label: '抖动' },
  { id: 'OT0001-jitter_2', label: '抖动2' },
  { id: 'OT0001-surface_blur', label: '表面模糊' },
  { id: 'OT0001-feather_dissolve', label: '羽化溶解' },
  { id: 'OT0001-horizontal_blur', label: '水平模糊' },
  { id: 'OT0001-vertical_blur', label: '竖向模糊' },
  { id: 'OT0001-lower_left_radial_blur', label: '左下径向模糊' },
  { id: 'OT0001-upper_right_radial_blur', label: '右上径向模糊' },
  { id: 'OT0001-center_radial_blur', label: '中心径向模糊' },
  { id: 'OT0001-flash_black', label: '闪黑' },
  { id: 'OT0001-dissolve', label: '溶解' },
  { id: 'OT0001-flash_white', label: '闪白' },
  { id: 'OT0001-elastic_ease_out', label: '弹性缓出' },
  { id: 'OT0001-overlay', label: '叠加' },
  // 特效
  { id: 'OT0001-bounce_feather_camera', label: '弹动羽化' },
  { id: 'OT0001-spin_glow', label: '旋转发光' },
  { id: 'OT0001-mixed_spin', label: '混合旋转' },
  { id: 'OT0001-light_shake', label: '光效晃动' },
  { id: 'OT0001-exposure', label: '曝光' },
  { id: 'OT0001-heat_wave', label: '热浪' },
  { id: 'OT0001-water_drop', label: '水滴' },
  { id: 'OT0001-distortion_mask', label: '扭曲遮罩' },
  { id: 'OT0001-distortion_dissolve', label: '扭曲溶解' },
  { id: 'OT0001-spin_stretch', label: '旋转拉伸' },
  { id: 'OT0001-flashback', label: '闪回' },
  { id: 'OT0001-compression', label: '压缩' },
  { id: 'OT0001-blink', label: '眨眼' },
  { id: 'OT0001-horizontal_slice', label: '水平切片' },
  { id: 'OT0001-trapezoid', label: '梯形' },
  { id: 'OT0001-spin_slice', label: '旋转切片' },
  { id: 'OT0001-color_glitch', label: '颜色故障' },
  { id: 'OT0001-color_glitch_2', label: '颜色故障2' },
  { id: 'OT0001-color_glitch_3', label: '颜色故障3' },
];

// ========== 字体枚举 ==========
export const FONT_LIST: { id: string; label: string; chinese: boolean }[] = [
  { id: 'Alibaba PuHuiTi', label: '阿里巴巴普惠体', chinese: true },
  { id: 'Microsoft YaHei', label: '微软雅黑', chinese: true },
  { id: 'SimSun', label: '宋体', chinese: true },
  { id: 'KaiTi', label: '楷体', chinese: true },
  { id: 'FZFangSong-Z02S', label: '方正仿宋简体', chinese: true },
  { id: 'FZHei-B01S', label: '方正黑体简体', chinese: true },
  { id: 'FZKai-Z03S', label: '方正楷体简体', chinese: true },
  { id: 'FZShuSong-Z01S', label: '方正书宋简体', chinese: true },
  { id: 'Source Han Sans CN', label: '思源黑体', chinese: true },
  { id: 'Source Han Serif CN', label: '思源宋体', chinese: true },
  { id: 'WenQuanYi MicroHei', label: '文泉驿微米黑', chinese: true },
  { id: 'WenQuanYi Zen Hei Mono', label: '文泉驿等宽正黑', chinese: true },
  { id: 'WenQuanYi Zen Hei Sharp', label: '文泉驿点阵正黑', chinese: true },
  { id: 'Yuanti SC', label: '圆体', chinese: true },
  { id: 'HappyZcool-2016', label: '站酷快乐体', chinese: true },
  { id: 'Roboto', label: 'Roboto', chinese: false },
  { id: 'Roboto Bold', label: 'Roboto Bold', chinese: false },
];

// ========== IMS 内置语音列表 ==========
export const IMS_VOICE_LIST: Record<string, { id: string; label: string; desc: string }[]> = {
  '多情感(荐)': [
    { id: 'zhimiao_emo', label: '知妙', desc: '多情感女声' },
    { id: 'zhimi_emo', label: '知米', desc: '亲和女声' },
    { id: 'zhibei_emo', label: '知贝', desc: '活力童声' },
    { id: 'zhiyan_emo', label: '知燕', desc: '直播女声' },
    { id: 'zhitian_emo', label: '知甜', desc: '甜美女声' },
  ],
  '超高清(荐)': [
    { id: 'zhitian', label: '知甜', desc: '甜美女声' },
    { id: 'zhiqing', label: '知青', desc: '中国台湾话女声' },
    { id: 'zhichu', label: '知厨', desc: '舌尖男声' },
    { id: 'zhide', label: '知德', desc: '新闻男声' },
    { id: 'zhifei', label: '知飞', desc: '激昂解说' },
    { id: 'zhijia', label: '知佳', desc: '标准女声' },
    { id: 'zhilun', label: '知伦', desc: '悬疑解说' },
    { id: 'zhinan', label: '知楠', desc: '广告男声' },
    { id: 'zhiqi', label: '知琪', desc: '温柔女声' },
    { id: 'zhiqian', label: '知倩', desc: '资讯女声' },
    { id: 'zhiru', label: '知茹', desc: '新闻女声' },
    { id: 'zhiwei', label: '知薇', desc: '萝莉女声' },
    { id: 'zhixiang', label: '知祥', desc: '磁性男声' },
  ],
  数字人: [
    { id: 'abin', label: '阿斌', desc: '广东普通话' },
    { id: 'zhixiaobai', label: '知小白', desc: '普通话女声' },
    { id: 'zhixiaoxia', label: '知小夏', desc: '普通话女声' },
  ],
  客服: [
    { id: 'zhiya', label: '知雅', desc: '普通话女声' },
    { id: 'aixia', label: '艾夏', desc: '亲和女声' },
    { id: 'aiyue', label: '艾悦', desc: '温柔女声' },
    { id: 'aiya', label: '艾雅', desc: '严厉女声' },
    { id: 'aijing', label: '艾婧', desc: '严厉女声' },
    { id: 'aimei', label: '艾美', desc: '甜美女声' },
    { id: 'siyue', label: '思悦', desc: '温柔女声' },
    { id: 'aina', label: '艾娜', desc: '浙普女声' },
    { id: 'aishuo', label: '艾硕', desc: '自然男声' },
    { id: 'aiyu', label: '艾雨', desc: '自然女声' },
    { id: 'xiaomei', label: '小美', desc: '甜美女声' },
    { id: 'yina', label: '伊娜', desc: '浙普女声' },
    { id: 'sijing', label: '思婧', desc: '严厉女声' },
  ],
  通用: [
    { id: 'zhiyuan', label: '知媛', desc: '普通话女声' },
    { id: 'zhiyue', label: '知悦', desc: '普通话女声' },
    { id: 'zhistella', label: '知莎', desc: '普通话女声' },
    { id: 'zhigui', label: '知柜', desc: '普通话女声' },
    { id: 'zhishuo', label: '知硕', desc: '普通话男声' },
    { id: 'zhida', label: '知达', desc: '普通话男声' },
    { id: 'aiqi', label: '艾琪', desc: '温柔女声' },
    { id: 'aicheng', label: '艾诚', desc: '标准男声' },
    { id: 'aijia', label: '艾佳', desc: '标准女声' },
    { id: 'siqi', label: '思琪', desc: '温柔女声' },
    { id: 'sijia', label: '思佳', desc: '标准女声' },
    { id: 'mashu', label: '马树', desc: '儿童剧男声' },
    { id: 'yuer', label: '悦儿', desc: '儿童剧女声' },
    { id: 'ruoxi', label: '若兮', desc: '温柔女声' },
    { id: 'aida', label: '艾达', desc: '标准男声' },
    { id: 'sicheng', label: '思诚', desc: '标准男声' },
    { id: 'ninger', label: '宁儿', desc: '标准女声' },
    { id: 'xiaoyun', label: '小云', desc: '标准女声' },
    { id: 'xiaogang', label: '小刚', desc: '标准男声' },
    { id: 'ruilin', label: '瑞琳', desc: '标准女声' },
  ],
  直播: [
    { id: 'zhimao', label: '知猫', desc: '普通话女声' },
    { id: 'laomei', label: '老妹', desc: '吆喝女声' },
    { id: 'laotie', label: '老铁', desc: '东北老铁' },
    { id: 'xiaoxian', label: '小仙', desc: '亲切女声' },
    { id: 'guijie', label: '柜姐', desc: '亲切女声' },
    { id: 'stella', label: 'Stella', desc: '知性女声' },
    { id: 'maoxiaomei', label: '猫小美', desc: '活力女声' },
    { id: 'qiaowei', label: '巧薇', desc: '卖场主播' },
    { id: 'ailun', label: '艾伦', desc: '悬疑解说' },
    { id: 'aifei', label: '艾飞', desc: '激昂解说' },
    { id: 'yaqun', label: '亚群', desc: '卖场广播' },
    { id: 'stanley', label: 'Stanley', desc: '沉稳男声' },
    { id: 'kenny', label: 'Kenny', desc: '温暖男声' },
    { id: 'rosa', label: 'Rosa', desc: '自然女声' },
  ],
  童声: [
    { id: 'aitong', label: '艾彤', desc: '儿童音' },
    { id: 'aiwei', label: '艾薇', desc: '萝莉女声' },
    { id: 'jielidou', label: '杰力豆', desc: '治愈童声' },
    { id: 'xiaobei', label: '小北', desc: '萝莉女声' },
    { id: 'sitong', label: '思彤', desc: '儿童音' },
    { id: 'aibao', label: '艾宝', desc: '萝莉女声' },
  ],
  多语种: [
    { id: 'perla', label: 'Perla', desc: '意大利语女声' },
    { id: 'camila', label: 'Camila', desc: '西班牙语女声' },
    { id: 'masha', label: 'masha', desc: '俄语女声' },
    { id: 'kyong', label: 'Kyong', desc: '韩语女声' },
    { id: 'tien', label: 'Tien', desc: '越南语女声' },
    { id: 'tomoka', label: '智香', desc: '日语女声' },
    { id: 'tomoya', label: '智也', desc: '日语男声' },
    { id: 'indah', label: 'Indah', desc: '印尼女声' },
    { id: 'farah', label: 'Farah', desc: '马来语女声' },
    { id: 'tala', label: 'Tala', desc: '菲律宾语女声' },
  ],
  英文: [
    { id: 'ava', label: 'Ava', desc: '美式女声' },
    { id: 'luca', label: 'Luca', desc: '英音男声' },
    { id: 'luna', label: 'Luna', desc: '英音女声' },
    { id: 'emily', label: 'Emily', desc: '英音女声' },
    { id: 'eric', label: 'Eric', desc: '英音男声' },
    { id: 'annie', label: 'Annie', desc: '美语女声' },
    { id: 'andy', label: 'Andy', desc: '美音男声' },
    { id: 'abby', label: 'Abby', desc: '美音女声' },
    { id: 'lydia', label: 'Lydia', desc: '英中双语' },
    { id: 'olivia', label: 'Olivia', desc: '英音女声' },
    { id: 'wendy', label: 'Wendy', desc: '英音女声' },
    { id: 'harry', label: 'Harry', desc: '英音男声' },
  ],
  方言: [
    { id: 'cuijie', label: '翠姐', desc: '东北话女声' },
    { id: 'kelly', label: 'Kelly', desc: '中国香港粤语女声' },
    { id: 'jiajia', label: '佳佳', desc: '粤语女声' },
    { id: 'dahu', label: '大虎', desc: '东北话男声' },
    { id: 'aikan', label: '艾侃', desc: '天津话男声' },
    { id: 'taozi', label: '桃子', desc: '粤语女声' },
    { id: 'qingqing', label: '青青', desc: '中国台湾话女声' },
    { id: 'xiaoze', label: '小泽', desc: '湖南重口音' },
    { id: 'shanshan', label: '姗姗', desc: '粤语女声' },
    { id: 'chuangirl', label: '小玥', desc: '四川话女声' },
  ],
  'CosyVoice v1': [
    { id: 'longwan', label: '龙婉', desc: '语音助手/数字人' },
    { id: 'longcheng', label: '龙橙', desc: '语音助手/数字人' },
    { id: 'longhua', label: '龙华', desc: '语音助手/数字人' },
    { id: 'longxiaochun', label: '龙小淳', desc: '中英文混合' },
    { id: 'longxiaoxia', label: '龙小夏', desc: '语音助手/数字人' },
    { id: 'longxiaocheng', label: '龙小诚', desc: '中英文混合' },
    { id: 'longxiaobai', label: '龙小白', desc: '有声书/助手' },
    { id: 'longlaotie', label: '龙老铁', desc: '东北口音' },
    { id: 'longshu', label: '龙书', desc: '有声书/新闻' },
    { id: 'longshuo', label: '龙硕', desc: '新闻/客服' },
    { id: 'longjing', label: '龙婧', desc: '新闻/客服' },
    { id: 'longmiao', label: '龙妙', desc: '客服/有声书' },
    { id: 'longyue', label: '龙悦', desc: '朗诵/有声书' },
    { id: 'longyuan', label: '龙媛', desc: '有声书/助手' },
    { id: 'longfei', label: '龙飞', desc: '新闻/有声书' },
    { id: 'longjielidou', label: '龙杰力豆', desc: '中英文混合' },
    { id: 'longtong', label: '龙彤', desc: '有声书/数字人' },
    { id: 'longxiang', label: '龙祥', desc: '新闻/有声书' },
    { id: 'loongstella', label: 'Stella', desc: '中英文/直播' },
    { id: 'loongbella', label: 'Bella', desc: '助手/新闻' },
  ],
  'CosyVoice v2': [
    { id: 'longcheng_v2', label: '龙橙2.0', desc: '译制片' },
    { id: 'longhua_v2', label: '龙华2.0', desc: '客服/新闻/有声书' },
    { id: 'longshu_v2', label: '龙书2.0', desc: '新闻/有声书' },
    { id: 'loongbella_v2', label: 'Bella2.0', desc: '客服/新闻/有声书' },
    { id: 'longwan_v2', label: '龙婉2.0', desc: '客服/有声书' },
    { id: 'longxiaochun_v2', label: '龙小淳2.0', desc: '客服/有声书' },
    { id: 'longxiaoxia_v2', label: '龙小夏2.0', desc: '客服/有声书' },
  ],
};

// ========== 特效效果枚举（带中文名）==========
export const VFX_EFFECT_LIST: Record<string, { id: string; label: string }[]> = {
  基础: [
    { id: 'open', label: '开幕' }, { id: 'close', label: '闭幕' },
    { id: 'h_blur', label: '横向模糊' }, { id: 'v_blur', label: '纵向模糊' },
    { id: 'blur', label: '模糊' }, { id: 'slightshake', label: '轻微抖动' },
    { id: 'zoominout', label: '镜头变焦' }, { id: 'movie', label: '电影感' },
    { id: 'zoomslight', label: '轻微放大' }, { id: 'color_difference', label: '色差' },
    { id: 'withcircleopen', label: '聚光灯打开' }, { id: 'withcircleclose', label: '聚光灯关闭' },
    { id: 'withcircleshake', label: '聚光灯抖动' }, { id: 'withcircleflashlight', label: '手电筒' },
    { id: 'disappear', label: '滑动消失' }, { id: 'shock', label: '震惊' },
    { id: 'bluropen', label: '模糊开幕' }, { id: 'blurclose', label: '模糊闭幕' },
    { id: 'photograph', label: '咔嚓' }, { id: 'black', label: '曝光降低' },
    { id: 'blurring', label: '渐变复古虚化' }, { id: 'color_to_grey', label: '彩色渐变黑白' },
    { id: 'grey_to_color', label: '黑白渐变彩色' }, { id: 'slightrectshow', label: '方形开幕' },
    { id: 'slightshow', label: '缓慢清晰开幕' }, { id: 'wipecross', label: '交叉开幕' },
    { id: 'whiteshow', label: '渐显开幕' }, { id: 'image_in_image', label: '画中画' },
  ],
  氛围: [
    { id: 'colorfulradial', label: '彩虹射线' }, { id: 'colorfulstarry', label: '绚烂星空' },
    { id: 'flyfire', label: '萤火' }, { id: 'heartfireworks', label: '爱心烟花' },
    { id: 'meteorshower', label: '流星雨' }, { id: 'moons_and_stars', label: '星月童话' },
    { id: 'sparklestarfield', label: '星星冲屏' }, { id: 'spotfall', label: '光斑飘落' },
    { id: 'starexplosion', label: '星光绽放' }, { id: 'starry', label: '繁星点点' },
  ],
  动感: [
    { id: 'white', label: '闪白' }, { id: 'minus_glitter', label: '负片闪烁' },
    { id: 'jitter', label: '抖动' }, { id: 'soulout', label: '灵魂出窍' },
    { id: 'scanlight', label: '扫描条纹' }, { id: 'swing', label: '摇摆' },
    { id: 'heartbeat', label: '心跳' }, { id: 'flashingscreen', label: '闪屏' },
    { id: 'illusion', label: '幻觉' }, { id: 'segmentation', label: '视频分割' },
    { id: 'neolighting', label: '霓虹灯' }, { id: 'curl', label: '卷动' },
    { id: 'shine', label: '闪动' }, { id: 'smalljitter', label: '毛刺' },
    { id: 'flashinglight', label: '闪光灯' }, { id: 'windowblur', label: '窗口过滤' },
    { id: 'windowblur2', label: '窗格' }, { id: 'kaleidoscope', label: '万花筒' },
  ],
  光影: [
    { id: 'moon_projection', label: '月亮投影' }, { id: 'star_projection', label: '星星投影' },
    { id: 'heart_projection', label: '爱心投影' }, { id: 'sunset_projection', label: '夕阳投影' },
    { id: 'carwindow_projection', label: '车窗投影' }, { id: 'shinningstar_light', label: '闪烁十字星' },
    { id: 'anglelight', label: '天使光' }, { id: 'darknight_rainbow', label: '暗夜彩虹' },
    { id: 'fallingcircle', label: '若隐若现' }, { id: 'lightcenter', label: '中心光' },
    { id: 'lightsweep', label: '阳光经过' }, { id: 'moon', label: '月食' },
    { id: 'rotationspotlight', label: '荧幕照耀' },
  ],
  复古: [
    { id: 'blackwhitetv', label: '电视噪声' }, { id: 'edgescan', label: '边界扫描' },
    { id: 'oldtv', label: '雪花故障' }, { id: 'oldtvshine', label: '老电视闪烁' },
    { id: 'nightvision', label: '夜视仪' }, { id: 'tvshow', label: 'TV Show' },
  ],
  梦幻: [
    { id: 'colorfulsun', label: '彩色太阳' }, { id: 'bigsun', label: '大太阳' },
    { id: 'fallingheart', label: '心雨' }, { id: 'colorfulfireworks', label: '彩色烟花' },
    { id: 'heartshot', label: '蹦爱心' }, { id: 'starfieldshinee', label: '星星闪烁' },
    { id: 'starfieldshinee2', label: '星星疯狂闪烁' }, { id: 'fireworks', label: '烟花爆炸' },
    { id: 'heartsurround', label: '爱心环绕' }, { id: 'risingheartbubble', label: '爱心泡泡' },
    { id: 'starfield', label: '星河发射' }, { id: 'colorfulripples', label: '彩色涟漪' },
    { id: 'colorfulbubbles', label: '彩色泡泡' }, { id: 'heartbubbleshinee', label: '爱心闪烁' },
    { id: 'starsparkle', label: '星星花火' },
  ],
  自然: [
    { id: 'rainy', label: '绵绵细雨' }, { id: 'waterripple', label: '水波荡漾' },
    { id: 'snow', label: '下雪' }, { id: 'foggy', label: '起雾' },
    { id: 'meteor', label: '下雨了' }, { id: 'stormlaser', label: '闪电' },
    { id: 'simpleripple', label: '水中浸泡' }, { id: 'fadeshadow', label: '黑色烟雾' },
  ],
  分屏: [
    { id: 'marquee', label: '跑马灯' }, { id: 'livesplit', label: '动态分屏' },
    { id: 'splitstill2', label: '二分屏' }, { id: 'splitstill3', label: '三分屏' },
    { id: 'splitstill4', label: '四分屏' }, { id: 'splitstill9', label: '九分屏' },
    { id: 'splitstill6', label: '六分屏' }, { id: 'blackwhitesplit', label: '黑白三格' },
    { id: 'blurthreesplit', label: '模糊分屏' },
  ],
  色彩: [
    { id: 'colorful', label: '炫彩' }, { id: 'blackfade', label: '颜色吞噬' },
    { id: 'rainbowfilter', label: '彩虹过滤色' }, { id: 'movingrainbow', label: '移动彩虹色' },
    { id: 'discolights', label: 'Disco' },
  ],
  变形: [
    { id: 'fisheye', label: '鱼眼' }, { id: 'mosaic_rect', label: '马赛克' },
    { id: 'glass', label: '毛玻璃' }, { id: 'planet', label: '全景图' },
  ],
};

// ========== 高级特效（需购买高级特效包）==========
export const ADVANCED_EFFECT_LIST: Record<string, { id: string; label: string }[]> = {
  信号抖动: [
    { id: 'OV0001-bad_singal_1', label: '信号抖动1' }, { id: 'OV0001-bad_singal_2', label: '信号抖动2' },
    { id: 'OV0001-bad_singal_3', label: '信号抖动3' }, { id: 'OV0001-bad_singal_4', label: '信号抖动4' },
    { id: 'OV0001-bad_singal_5', label: '信号抖动5' }, { id: 'OV0001-singal_glitch_1', label: '信号抖动6' },
    { id: 'OV0001-singal_glitch_2', label: '信号抖动7' },
  ],
  视角: [
    { id: 'OV0001-camera_viewer', label: '摄像机' }, { id: 'OV0001-vertical_video', label: '竖屏' },
    { id: 'OV0001-vertical_video2', label: '横屏' }, { id: 'OV0001-tv_crt_1', label: '电视机1' },
    { id: 'OV0001-tv_crt_2', label: '电视机2' }, { id: 'OV0001-tv_crt_3', label: '电视机3' },
    { id: 'OV0001-tv_crt_4', label: '电视4' }, { id: 'OV0001-tv_crt_old_1', label: '黑白电视机' },
  ],
  流光: [
    { id: 'OV0001-flow_move_light_1', label: '流光1' }, { id: 'OV0001-flow_move_light_2', label: '流光2' },
    { id: 'OV0001-flow_move_light_3', label: '流光3' }, { id: 'OV0001-flow_move_light_4', label: '流光4' },
    { id: 'OV0001-flow_move_light_5', label: '流光5' }, { id: 'OV0001-flow_move_light_6', label: '流光6' },
    { id: 'OV0001-flow_move_light_7', label: '流光7' }, { id: 'OV0001-flow_move_light_8', label: '流光8' },
    { id: 'OV0001-flow_move_light_9', label: '流光9' }, { id: 'OV0001-flow_move_light_10', label: '流光10' },
    { id: 'OV0001-flow_move_light_11', label: '流光11' }, { id: 'OV0001-flow_move_light_12', label: '流光12' },
    { id: 'OV0001-flow_move_light_13', label: '流光13' },
  ],
  中心光: [
    { id: 'OV0001-center_light_1', label: '中心光1' }, { id: 'OV0001-center_light_2', label: '中心光2' },
    { id: 'OV0001-center_light_3', label: '中心光3' }, { id: 'OV0001-center_light_4', label: '中心光4' },
    { id: 'OV0001-center_light_5', label: '中心光5' }, { id: 'OV0001-center_light_6', label: '中心光6' },
    { id: 'OV0001-center_light_7', label: '中心光7' }, { id: 'OV0001-center_light_8', label: '中心光8' },
    { id: 'OV0001-center_light_9', label: '中心光9' },
  ],
  文字特效: [
    { id: 'OV0001-hacker_world_1', label: '流动文字1' }, { id: 'OV0001-hacker_world_2', label: '流动文字2' },
    { id: 'OV0001-hacker_world_3', label: '流动文字3' },
  ],
  粒子: [
    { id: 'OV0001-particles_1', label: '粒子1' }, { id: 'OV0001-particles_2', label: '粒子2' },
    { id: 'OV0001-particles_3', label: '粒子3' },
  ],
  彩色泡泡: [
    { id: 'OV0001-pop_up_color_1', label: '彩色泡泡1' }, { id: 'OV0001-pop_up_color_2', label: '彩色泡泡2' },
    { id: 'OV0001-pop_up_color_3', label: '彩色泡泡3' }, { id: 'OV0001-pop_up_color_4', label: '彩色泡泡4' },
    { id: 'OV0001-pop_up_color_5', label: '彩色泡泡5' }, { id: 'OV0001-pop_up_color_6', label: '彩色泡泡6' },
    { id: 'OV0001-pop_up_color_7', label: '彩色泡泡7' }, { id: 'OV0001-pop_up_color_8', label: '彩色泡泡8' },
  ],
  天气自然: [
    { id: 'OV0001-rain_1', label: '雨雪1' }, { id: 'OV0001-rain_2', label: '雨雪2' },
    { id: 'OV0001-snow_1', label: '雨雪3' }, { id: 'OV0001-snow_2', label: '雨雪4' },
    { id: 'OV0001-snow_3', label: '雨雪5' }, { id: 'OV0001-snow_4', label: '雨雪6' },
    { id: 'OV0001-rain_glass_2', label: '下雨窗外1' }, { id: 'OV0001-rain_glass_3', label: '下雨窗外2' },
    { id: 'OV0001-rain_glass_4', label: '下雨窗外3' }, { id: 'OV0001-rain_glass_5', label: '下雨窗外4' },
    { id: 'OV0001-reflection_water', label: '倒影' },
  ],
  动态形状: [
    { id: 'OV0001-wave_1', label: '波浪1' }, { id: 'OV0001-wave_2', label: '波浪2' },
    { id: 'OV0001-wave_3', label: '波浪3' }, { id: 'OV0001-box_1', label: '格子1' },
    { id: 'OV0001-box_2', label: '格子2' }, { id: 'OV0001-blur_1', label: '燃烧1' },
    { id: 'OV0001-bottom_burn', label: '燃烧2' }, { id: 'OV0001-bottom_burn2', label: '燃烧3' },
    { id: 'OV0001-smog_1', label: '烟雾' },
  ],
};

// ========== 滤镜效果枚举（带中文名）==========
export const FILTER_LIST: Record<string, { id: string; label: string }[]> = {
  '90s现代胶片': [
    { id: 'm1', label: '复古' }, { id: 'm2', label: '灰调' },
    { id: 'm3', label: '青阶' }, { id: 'm4', label: '蓝调' },
    { id: 'm5', label: '暗红' }, { id: 'm6', label: '暗淡' },
    { id: 'm7', label: '灰橙' }, { id: 'm8', label: '通透' },
  ],
  胶片: [
    { id: 'pf1', label: '高调' }, { id: 'pf2', label: '富士' },
    { id: 'pf3', label: '暖色' }, { id: 'pf4', label: '柯达' },
    { id: 'pf5', label: '复古' }, { id: 'pf6', label: '反转' },
    { id: 'pf7', label: '红外' }, { id: 'pf8', label: '宝丽来' },
    { id: 'pf9', label: '禄来' }, { id: 'pfa', label: '工业' },
    { id: 'pfb', label: '灰阶' }, { id: 'pfc', label: '白阶' },
  ],
  红外: [
    { id: 'pi1', label: '清透' }, { id: 'pi2', label: '暮晚' },
    { id: 'pi3', label: '秋色' }, { id: 'pi4', label: '暗调' },
  ],
  清新: [
    { id: 'pl1', label: '影调' }, { id: 'pl2', label: '柔和' },
    { id: 'pl3', label: '春芽' }, { id: 'pl4', label: '明媚' },
  ],
  日系: [
    { id: 'pj1', label: '小森林' }, { id: 'pj2', label: '童年' },
    { id: 'pj3', label: '午后' }, { id: 'pj4', label: '花雾' },
  ],
  Unsplash: [
    { id: 'delta', label: '白桃' }, { id: 'electric', label: '林间' },
    { id: 'faded', label: '盐系' }, { id: 'slowlived', label: '蓝雾' },
    { id: 'tokoyo', label: '东京' }, { id: 'urbex', label: '雨后' },
    { id: 'warm', label: '温暖' },
  ],
  '80s负片': [
    { id: 'f1', label: '济州岛' }, { id: 'f2', label: '雪山' },
    { id: 'f3', label: '布达佩斯' }, { id: 'f4', label: '蓝霜' },
    { id: 'f5', label: '尤加利' }, { id: 'f6', label: '老街' },
    { id: 'f7', label: '咖啡' },
  ],
  旅行: [
    { id: 'pv1', label: '质感' }, { id: 'pv2', label: '天色' },
    { id: 'pv3', label: '清新' }, { id: 'pv4', label: '雾气' },
    { id: 'pv5', label: '高调' }, { id: 'pv6', label: '黑白' },
  ],
  '90s艺术胶片': [
    { id: 'a1', label: '柔和' }, { id: 'a2', label: '暗调' },
    { id: 'a3', label: '青空' }, { id: 'a4', label: '蓝光' },
    { id: 'a5', label: '艳丽' }, { id: 'a6', label: '哑光' },
  ],
};

// ========== 花字模板（完整列表）==========
export const SUBTITLE_STYLE_LIST: { id: string; series: string }[] = [
  // CS0001 系列 (16款)
  ...Array.from({ length: 16 }, (_, i) => ({ id: `CS0001-${String(i + 1).padStart(6, '0')}`, series: '花字一·A' })),
  // CS0002 系列 (16款)
  ...Array.from({ length: 16 }, (_, i) => ({ id: `CS0002-${String(i + 1).padStart(6, '0')}`, series: '花字一·B' })),
  // CS0003 系列 (25款)
  ...Array.from({ length: 25 }, (_, i) => ({ id: `CS0003-${String(i + 1).padStart(6, '0')}`, series: '花字一·C' })),
  // CS0004 系列 (19款)
  ...Array.from({ length: 19 }, (_, i) => ({ id: `CS0004-${String(i + 1).padStart(6, '0')}`, series: '花字一·D' })),
  // CS0005 系列
  { id: 'CS0005-000003', series: '花字一·E' },
];

// ========== 气泡字模板（完整列表）==========
export const BUBBLE_STYLE_LIST: { id: string; category: string }[] = [
  // BS0001 电商类 (5款)
  ...Array.from({ length: 5 }, (_, i) => ({ id: `BS0001-${String(i + 1).padStart(6, '0')}`, category: '电商' })),
  // BS0002 企业类 (5款)
  ...Array.from({ length: 5 }, (_, i) => ({ id: `BS0002-${String(i + 1).padStart(6, '0')}`, category: '企业' })),
  // BS0003 教育类 (5款)
  ...Array.from({ length: 5 }, (_, i) => ({ id: `BS0003-${String(i + 1).padStart(6, '0')}`, category: '教育' })),
  // BS0004 综艺类 (5款)
  ...Array.from({ length: 5 }, (_, i) => ({ id: `BS0004-${String(i + 1).padStart(6, '0')}`, category: '综艺' })),
  // BS0005 视频类 (5款)
  ...Array.from({ length: 5 }, (_, i) => ({ id: `BS0005-${String(i + 1).padStart(6, '0')}`, category: '视频' })),
  // BS0006 科技类 (5款)
  ...Array.from({ length: 5 }, (_, i) => ({ id: `BS0006-${String(i + 1).padStart(6, '0')}`, category: '科技' })),
  // BS0007 新闻类 (3款)
  ...Array.from({ length: 3 }, (_, i) => ({ id: `BS0007-${String(i + 1).padStart(6, '0')}`, category: '新闻' })),
];

@Injectable()
export class AliyunIMSProvider implements BatchComposeProvider {
  readonly providerId = 'aliyun-ims';
  readonly displayName = '阿里云智能媒体成片';
  private readonly logger = new Logger(AliyunIMSProvider.name);
  private client: ICE20201109 | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): ICE20201109 {
    if (!this.client) {
      const accessKeyId = this.config.get<string>('ALIYUN_ACCESS_KEY_ID', '');
      const accessKeySecret = this.config.get<string>('ALIYUN_ACCESS_KEY_SECRET', '');
      const region = this.config.get<string>('ALIYUN_IMS_REGION', 'cn-shanghai');

      const config = new $OpenApi.Config({
        accessKeyId,
        accessKeySecret,
        endpoint: `ice.${region}.aliyuncs.com`,
      });
      this.client = new ICE20201109(config);
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('ALIYUN_ACCESS_KEY_ID') && !!this.config.get<string>('ALIYUN_ACCESS_KEY_SECRET');
  }

  async submitBatchJob(
    inputConfig: any,
    editingConfig: any,
    outputConfig: any,
    callbackUrl?: string,
    callbackToken?: string,
  ): Promise<{ jobId: string }> {
    this.logger.log('Submitting batch media producing job to Aliyun IMS');

    const client = this.getClient();

    const request = new $ICE20201109.SubmitBatchMediaProducingJobRequest({
      inputConfig: JSON.stringify(inputConfig),
      editingConfig: JSON.stringify(editingConfig),
      outputConfig: JSON.stringify(outputConfig),
    });

    // Set callback URL via UserData if provided
    if (callbackUrl) {
      const userData: any = { NotifyAddress: callbackUrl };
      if (callbackToken) {
        userData.CallbackToken = callbackToken;
      }
      request.userData = JSON.stringify(userData);
    }

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.submitBatchMediaProducingJobWithOptions(request, runtime);
      const jobId = response.body?.jobId || '';
      this.logger.log(`IMS batch job submitted: ${jobId}`);
      return { jobId };
    } catch (error: any) {
      this.logger.error(`IMS submit failed: ${error.message}`);
      throw new Error(`IMS batch job submit failed: ${error.message}`);
    }
  }

  async checkJobStatus(jobId: string): Promise<{ status: string; subJobs?: any[]; progress?: number; errorDetail?: string }> {
    this.logger.log(`Checking IMS job status: ${jobId}`);

    const client = this.getClient();

    const request = new $ICE20201109.GetBatchMediaProducingJobRequest({ jobId });
    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.getBatchMediaProducingJobWithOptions(request, runtime);
      const job = response.body?.editingBatchJob;

      if (!job) {
        return { status: 'UNKNOWN', progress: 0 };
      }

      // Parse sub-jobs for progress
      const subJobs: any[] = (job.subJobList as any[]) || [];
      const total = subJobs.length || 1;
      const completed = subJobs.filter(
        (sj: any) => sj.status === 'Success' || sj.status === 'Failed',
      ).length;
      const progress = Math.round((completed / total) * 100);

      // Map IMS status to our status
      let status = 'PROCESSING';
      if (job.status === 'Finished') status = 'Finished';
      else if (job.status === 'Failed') {
        // Parse error from extend field
        let errorDetail = '';
        try {
          const ext = JSON.parse(job.extend || '{}');
          errorDetail = ext.ErrorMessage || ext.ErrorCode || '';
        } catch { /* ignore */ }
        this.logger.error(`IMS job ${jobId} failed: ${errorDetail || 'unknown error'}`);
        status = 'Failed';
      } else if (job.status === 'Init') status = 'PENDING';

      // Check if all sub-jobs failed
      const allFailed = subJobs.length > 0 && subJobs.every((sj: any) => sj.status === 'Failed');
      if (allFailed) {
        const failReasons = subJobs
          .filter((sj: any) => sj.status === 'Failed')
          .map((sj: any) => `${sj.errorCode || 'UnknownCode'}: ${sj.errorMessage || 'no message'}`)
          .join('; ');
        this.logger.error(`IMS job ${jobId} all sub-jobs failed: ${failReasons}`);
        status = 'Failed';
      }

      // Collect error detail string for callers
      let errorDetail = '';
      if (status === 'Failed') {
        const failedSubs = subJobs.filter((sj: any) => sj.status === 'Failed');
        if (failedSubs.length) {
          errorDetail = failedSubs.map((sj: any) => `${sj.errorCode || ''}: ${sj.errorMessage || ''}`).join('; ');
        }
        if (!errorDetail) {
          try {
            const ext = JSON.parse(job.extend || '{}');
            errorDetail = ext.ErrorMessage || ext.ErrorCode || '';
          } catch { /* ignore */ }
        }
      }

      return {
        status,
        progress,
        errorDetail,
        subJobs: subJobs.map((sj: any) => ({
          mediaId: sj.mediaId,
          mediaURL: sj.mediaURL,
          duration: sj.duration,
          projectId: sj.projectId,
          status: sj.status,
          errorCode: sj.errorCode,
          errorMessage: sj.errorMessage,
        })),
      };
    } catch (error: any) {
      this.logger.error(`IMS status check failed: ${error.message}`);
      throw new Error(`IMS status check failed: ${error.message}`);
    }
  }

  async getEditingProject(projectId: string): Promise<EditingProjectSnapshot | null> {
    this.logger.log(`Fetching IMS editing project: ${projectId}`);

    const client = this.getClient();
    const request = new $ICE20201109.GetEditingProjectRequest({
      projectId,
      requestSource: 'WebSDK',
    });
    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.getEditingProjectWithOptions(request, runtime);
      const project = response.body?.project;

      if (!project) {
        return null;
      }

      return {
        projectId: project.projectId || projectId,
        title: project.title,
        status: project.status,
        duration: project.duration,
        coverURL: project.coverURL,
        modifiedTime: project.modifiedTime,
        timeline: this.parseJsonObject(project.timeline),
        timelineRaw: project.timeline,
        timelineConvertStatus: project.timelineConvertStatus,
        timelineConvertErrorMessage: project.timelineConvertErrorMessage,
      };
    } catch (error: any) {
      this.logger.error(`IMS get editing project failed: ${error.message}`);
      throw new Error(`IMS get editing project failed: ${error.message}`);
    }
  }

  private parseJsonObject(value?: string) {
    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  private parseJsonLike<T = any>(value: unknown): T | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return undefined;
      }
    }

    if (typeof value === 'object') {
      return value as T;
    }

    return undefined;
  }

  private pickFirstString(...candidates: unknown[]): string | undefined {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
    return undefined;
  }

  /**
   * 构建 InputConfig — 输入素材配置
   */
  buildInputConfig(config: {
    mode: 'global' | 'group';
    mediaGroups: {
      groupName: string;
      mediaUrls: string[];
      speechTexts?: string[];
      duration?: number;
      splitMode?: string;
      volume?: number;
      durationAutoAdapt?: boolean;
    }[];
    speechTexts?: string[];
    titles?: string[];
    subHeadings?: { level: number; titles: string[] }[];
    backgroundMusic?: string[];
    stickers?: { url: string; x: number; y: number; width: number; height: number; opacity?: number; dyncFrames?: number }[];
    backgroundImages?: string[];
  }): any {
    this.validateOssRegions([
      ...config.mediaGroups.flatMap((group) => group.mediaUrls),
      ...(config.backgroundMusic || []),
      ...(config.backgroundImages || []),
      ...(config.stickers?.map((sticker) => sticker.url) || []),
    ]);

    const inputConfig: any = {
      MediaGroupArray: config.mediaGroups.map((g) => ({
        GroupName: g.groupName,
        MediaArray: g.mediaUrls,
        ...(g.speechTexts && { SpeechTextArray: g.speechTexts }),
        ...(g.duration && { Duration: g.duration }),
        ...(g.splitMode && { SplitMode: g.splitMode }),
        ...(g.volume !== undefined && { Volume: g.volume }),
        ...(g.durationAutoAdapt && { DurationAutoAdapt: true }),
      })),
    };

    if (config.speechTexts?.length) inputConfig.SpeechTextArray = config.speechTexts;
    if (config.titles?.length) inputConfig.TitleArray = config.titles;
    if (config.backgroundMusic?.length) inputConfig.BackgroundMusicArray = config.backgroundMusic;
    if (config.backgroundImages?.length) inputConfig.BackgroundImageArray = config.backgroundImages;

    if (config.subHeadings?.length) {
      inputConfig.SubHeadingArray = config.subHeadings.map((sh) => ({
        Level: sh.level,
        TitleArray: sh.titles,
      }));
    }

    if (config.stickers?.length) {
      inputConfig.StickerArray = config.stickers.map((s) => ({
        MediaURL: s.url,
        X: s.x, Y: s.y, Width: s.width, Height: s.height,
        ...(s.opacity !== undefined && { Opacity: s.opacity }),
        ...(s.dyncFrames !== undefined && { DyncFrames: s.dyncFrames }),
      }));
    }

    return inputConfig;
  }

  private validateOssRegions(values: string[]) {
    const expectedRegion = this.config.get<string>('ALIYUN_IMS_REGION', 'cn-shanghai');

    for (const value of values) {
      const actualRegion = this.extractOssRegion(value);
      if (actualRegion && actualRegion !== expectedRegion) {
        throw new Error(
          `OSS region mismatch: expected ${expectedRegion}, received ${actualRegion}`,
        );
      }
    }
  }

  private extractOssRegion(value: string): string | null {
    if (!/^https?:\/\//i.test(value)) return null;

    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();
      const patterns = [
        /^.+\.oss-([a-z0-9-]+)\.aliyuncs\.com$/,
        /^.+\.oss-([a-z0-9-]+)-internal\.aliyuncs\.com$/,
        /^oss-([a-z0-9-]+)\.aliyuncs\.com$/,
      ];

      for (const pattern of patterns) {
        const match = hostname.match(pattern);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 构建 EditingConfig — 剪辑配置
   * 包含：字幕、特效、转场、滤镜、人声等完整配置
   */
  buildEditingConfig(config: {
    // 媒体音量
    mediaVolume?: number;
    mediaMetaData?: {
      groupName?: string;
      mediaUrl: string;
      trimIn?: number;
      trimOut?: number;
    }[];
    // 口播配置
    speechVolume?: number;
    speechRate?: number;
    customizedVoice?: string;
    voice?: string;
    speechStyle?: string;
    speechLanguage?: string;
    // 字幕配置 (AsrConfig)
    subtitleConfig?: {
      font?: string;
      fontUrl?: string;
      fontSize?: number;
      fontColor?: string;
      fontColorOpacity?: number;
      alignment?: string;
      x?: number | string;
      y?: number | string;
      adaptMode?: string;
      textWidth?: number;
      outline?: number;
      outlineColour?: string;
      shadow?: number;
      backColour?: string;
      effectColorStyleId?: string;
      bubbleStyleId?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
    // 特殊词汇配置
    specialWordsConfig?: {
      type: 'Highlight' | 'Forbidden';
      wordsList: string[];
      style?: {
        fontName?: string;
        fontSize?: number;
        fontColor?: string;
        outlineColour?: string;
        outline?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
      };
      soundReplaceMode?: string;
    }[];
    // 标题配置
    titleConfig?: {
      font?: string;
      fontSize?: number;
      fontColor?: string;
      alignment?: string;
      y?: number | string;
      adaptMode?: string;
      effectColorStyleId?: string;
    };
    // 副标题配置
    subHeadingConfig?: Record<string, {
      y?: number | string;
      fontSize?: number;
      fontColor?: string;
      alignment?: string;
    }>;
    // 背景音乐
    backgroundMusicVolume?: number;
    backgroundMusicStyle?: string;
    // 背景图
    backgroundImageType?: string;
    backgroundImageColor?: string;
    backgroundImageRadius?: number;
    // 处理配置
    singleShotDuration?: number;
    enableClipSplit?: boolean;
    imageDuration?: number;
    // 特效
    allowEffects?: boolean;
    vfxEffectProbability?: number;
    vfxFirstClipEffectList?: string[];
    vfxNotFirstClipEffectList?: string[];
    // 转场
    allowTransition?: boolean;
    transitionDuration?: number;
    transitionList?: string[];
    useUniformTransition?: boolean;
    // 滤镜
    allowFilter?: boolean;
    filterList?: string[];
    // 对齐模式
    alignmentMode?: string;
    // 二创去重
    dedupSmartCrop?: boolean;
    dedupSmartZoom?: boolean;
    dedupSmartMirror?: boolean;
    dedupTransparentMask?: boolean;
    dedupRandomSpeed?: boolean;
    // 封面配置
    coverConfig?: {
      coverTitle?: string;
      coverTitleFont?: string;
      coverTitleColor?: string;
      coverTitleSize?: number;
      coverTitlePosition?: 'top' | 'center' | 'bottom';
    };
  }): any {
    const mediaMetaDataArray = (config.mediaMetaData || [])
      .filter((item) => item.groupName && item.mediaUrl && item.trimIn !== undefined && item.trimOut !== undefined)
      .map((item) => ({
        GroupName: item.groupName,
        Media: item.mediaUrl,
        TimeRangeList: [
          {
            In: item.trimIn,
            Out: item.trimOut,
          },
        ],
      }));

    const editingConfig: any = {
      MediaConfig: {
        Volume: config.mediaVolume ?? 1,
        ...(mediaMetaDataArray.length && { MediaMetaDataArray: mediaMetaDataArray }),
      },
      SpeechConfig: {
        Volume: config.speechVolume ?? 1,
        SpeechRate: config.speechRate ?? 0,
        ...(config.customizedVoice && { CustomizedVoice: config.customizedVoice }),
        ...(config.voice && { Voice: config.voice }),
        ...(config.speechStyle && { Style: config.speechStyle }),
        ...(config.speechLanguage && { SpeechLanguage: config.speechLanguage }),
      },
      BackgroundMusicConfig: {
        Volume: config.backgroundMusicVolume ?? 0.2,
        ...(config.backgroundMusicStyle && { Style: config.backgroundMusicStyle }),
      },
      ProcessConfig: {
        SingleShotDuration: config.singleShotDuration ?? 3,
        ...(config.enableClipSplit !== undefined && { EnableClipSplit: config.enableClipSplit }),
        ...(config.imageDuration && { ImageDuration: config.imageDuration }),
        // 特效
        AllowVfxEffect: config.allowEffects ?? false,
        ...(config.vfxEffectProbability !== undefined && { VfxEffectProbability: config.vfxEffectProbability }),
        ...(config.vfxFirstClipEffectList?.length && { VfxFirstClipEffectList: config.vfxFirstClipEffectList }),
        ...(config.vfxNotFirstClipEffectList?.length && { VfxNotFirstClipEffectList: config.vfxNotFirstClipEffectList }),
        // 转场
        AllowTransition: config.allowTransition ?? false,
        ...(config.transitionDuration && { TransitionDuration: config.transitionDuration }),
        ...(config.transitionList?.length && { TransitionList: config.transitionList }),
        ...(config.useUniformTransition !== undefined && { UseUniformTransition: config.useUniformTransition }),
        // 滤镜
        AllowFilter: config.allowFilter ?? false,
        ...(config.filterList?.length && { FilterList: config.filterList }),
        // 对齐
        ...(config.alignmentMode && { AlignmentMode: config.alignmentMode }),
        // 二创去重
        ...(config.dedupSmartCrop && { EnableSmartCrop: true }),
        ...(config.dedupSmartZoom && { EnableSmartZoom: true }),
        ...(config.dedupSmartMirror && { EnableSmartMirror: true }),
        ...(config.dedupTransparentMask && { EnableTransparentMask: true }),
        ...(config.dedupRandomSpeed && { EnableRandomSpeed: true }),
      },
    };

    // 封面配置
    if (config.coverConfig) {
      const cc = config.coverConfig;
      const coverCfg: any = {
        Mode: 'Smart',
      };
      if (cc.coverTitle) {
        coverCfg.Title = cc.coverTitle;
        if (cc.coverTitleFont) coverCfg.Font = cc.coverTitleFont;
        if (cc.coverTitleColor) coverCfg.FontColor = cc.coverTitleColor;
        if (cc.coverTitleSize) coverCfg.FontSize = cc.coverTitleSize;
        if (cc.coverTitlePosition) {
          const posMap = { top: 0.15, center: 0.45, bottom: 0.75 };
          coverCfg.Y = posMap[cc.coverTitlePosition] ?? 0.45;
        }
      }
      editingConfig.CoverConfig = coverCfg;
    }

    // 字幕配置 (通过 AsrConfig)
    if (config.subtitleConfig) {
      const sc = config.subtitleConfig;
      const asrConfig: any = {};
      if (sc.font) asrConfig.Font = sc.font;
      if (sc.fontUrl) asrConfig.FontUrl = sc.fontUrl;
      if (sc.fontSize) asrConfig.FontSize = sc.fontSize;
      if (sc.fontColor) asrConfig.FontColor = sc.fontColor;
      if (sc.fontColorOpacity !== undefined) asrConfig.FontColorOpacity = sc.fontColorOpacity;
      if (sc.alignment) asrConfig.Alignment = sc.alignment;
      if (sc.x !== undefined) asrConfig.X = sc.x;
      if (sc.y !== undefined) asrConfig.Y = sc.y;
      if (sc.adaptMode) asrConfig.AdaptMode = sc.adaptMode;
      if (sc.textWidth) asrConfig.TextWidth = sc.textWidth;
      if (sc.outline !== undefined) asrConfig.Outline = sc.outline;
      if (sc.outlineColour) asrConfig.OutlineColour = sc.outlineColour;
      if (sc.shadow !== undefined) asrConfig.Shadow = sc.shadow;
      if (sc.backColour) asrConfig.BackColour = sc.backColour;
      if (sc.effectColorStyleId) asrConfig.EffectColorStyleId = sc.effectColorStyleId;
      if (sc.bubbleStyleId) asrConfig.BubbleStyleId = sc.bubbleStyleId;
      if (sc.bold || sc.italic || sc.underline) {
        asrConfig.FontFace = {
          ...(sc.bold && { Bold: true }),
          ...(sc.italic && { Italic: true }),
          ...(sc.underline && { Underline: true }),
        };
      }
      editingConfig.SpeechConfig.AsrConfig = asrConfig;
    }

    // 特殊词汇配置
    if (config.specialWordsConfig?.length) {
      editingConfig.SpeechConfig.SpecialWordsConfig = config.specialWordsConfig.map((sw) => {
        const item: any = {
          Type: sw.type,
          WordsList: sw.wordsList,
        };
        if (sw.style) {
          item.Style = {
            ...(sw.style.fontName && { FontName: sw.style.fontName }),
            ...(sw.style.fontSize && { FontSize: sw.style.fontSize }),
            ...(sw.style.fontColor && { FontColor: sw.style.fontColor }),
            ...(sw.style.outlineColour && { OutlineColour: sw.style.outlineColour }),
            ...(sw.style.outline !== undefined && { Outline: sw.style.outline }),
            ...(sw.style.bold || sw.style.italic || sw.style.underline ? {
              FontFace: {
                ...(sw.style.bold && { Bold: true }),
                ...(sw.style.italic && { Italic: true }),
                ...(sw.style.underline && { Underline: true }),
              },
            } : {}),
          };
        }
        if (sw.type === 'Forbidden' && sw.soundReplaceMode) {
          item.SoundReplaceMode = sw.soundReplaceMode;
        }
        return item;
      });
    }

    // 标题配置
    if (config.titleConfig) {
      const tc = config.titleConfig;
      editingConfig.TitleConfig = {
        ...(tc.font && { Font: tc.font }),
        ...(tc.fontSize && { FontSize: tc.fontSize }),
        ...(tc.fontColor && { FontColor: tc.fontColor }),
        ...(tc.alignment && { Alignment: tc.alignment }),
        ...(tc.y !== undefined && { Y: tc.y }),
        ...(tc.adaptMode && { AdaptMode: tc.adaptMode }),
        ...(tc.effectColorStyleId && { EffectColorStyleId: tc.effectColorStyleId }),
      };
    }

    // 副标题配置
    if (config.subHeadingConfig) {
      editingConfig.SubHeadingConfig = {};
      for (const [level, cfg] of Object.entries(config.subHeadingConfig)) {
        editingConfig.SubHeadingConfig[level] = {
          ...(cfg.y !== undefined && { Y: cfg.y }),
          ...(cfg.fontSize && { FontSize: cfg.fontSize }),
          ...(cfg.fontColor && { FontColor: cfg.fontColor }),
          ...(cfg.alignment && { Alignment: cfg.alignment }),
        };
      }
    }

    // 背景图配置
    if (config.backgroundImageType || config.backgroundImageRadius) {
      editingConfig.BackgroundImageConfig = {
        ...(config.backgroundImageType && { SubType: config.backgroundImageType }),
        ...(config.backgroundImageColor && { Color: config.backgroundImageColor }),
        ...(config.backgroundImageRadius && { Radius: config.backgroundImageRadius }),
      };
    }

    return editingConfig;
  }

  /**
   * 构建 OutputConfig — 输出配置
   */
  buildOutputConfig(config: {
    outputUrl: string;
    count: number;
    width: number;
    height: number;
    maxDuration?: number;
    fixedDuration?: number;
    crf?: number;
    generatePreviewOnly?: boolean;
  }): any {
    return {
      MediaURL: config.outputUrl,
      Count: config.count,
      Width: config.width,
      Height: config.height,
      ...(config.maxDuration && { MaxDuration: config.maxDuration }),
      ...(config.fixedDuration && { FixedDuration: config.fixedDuration }),
      ...(config.crf && { Video: { Crf: config.crf } }),
      ...(config.generatePreviewOnly && { GeneratePreviewOnly: true }),
    };
  }

  /**
   * 获取可用的转场效果列表
   */
  getTransitionList() {
    return TRANSITION_LIST;
  }

  /**
   * 获取可用的特效效果列表（按分类）
   */
  getEffectList() {
    return VFX_EFFECT_LIST;
  }

  /**
   * 获取可用的滤镜列表（按分类）
   */
  getFilterList() {
    return FILTER_LIST;
  }

  /**
   * 获取字幕花字模板列表
   */
  getSubtitleStyleList() {
    return SUBTITLE_STYLE_LIST;
  }

  /**
   * 获取气泡字模板列表
   */
  getBubbleStyleList() {
    return BUBBLE_STYLE_LIST;
  }

  async submitAvatarVideoJob(
    inputConfig: any,
    editingConfig: any,
    outputConfig: any,
    userData?: any,
  ): Promise<{ jobId: string; mediaId?: string }> {
    this.logger.log('Submitting avatar video job');

    const client = this.getClient();
    const request = new $ICE20201109.SubmitAvatarVideoJobRequest({
      inputConfig: JSON.stringify(inputConfig || {}),
      editingConfig: JSON.stringify(editingConfig || {}),
      outputConfig: JSON.stringify(outputConfig || {}),
    });

    if (userData !== undefined) {
      request.userData = typeof userData === 'string' ? userData : JSON.stringify(userData);
    }

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.submitAvatarVideoJobWithOptions(request, runtime);
      return {
        jobId: response.body?.jobId || '',
        mediaId: response.body?.mediaId || undefined,
      };
    } catch (error: any) {
      this.logger.error(`Submit avatar video job failed: ${error.message}`);
      throw new Error(`IMS avatar job submit failed: ${error.message}`);
    }
  }

  async getSmartHandleJob(jobId: string): Promise<{
    status: string;
    mediaId?: string;
    videoUrl?: string;
    maskUrl?: string;
    subtitleClips?: any[];
    errorCode?: string;
    errorMessage?: string;
  }> {
    const client = this.getClient();
    const request = new $ICE20201109.GetSmartHandleJobRequest({ jobId });
    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.getSmartHandleJobWithOptions(request, runtime);
      const body = response.body;
      const jobResult = (body?.jobResult || {}) as Record<string, any>;
      const aiResult = (this.parseJsonLike(jobResult.aiResult ?? jobResult.AiResult) || {}) as Record<string, any>;
      const output = (this.parseJsonLike(body?.output) || {}) as Record<string, any>;
      const smartOutputConfig = (body?.smartJobInfo?.outputConfig || body?.smartJobInfo?.OutputConfig || {}) as Record<string, any>;

      const mediaId = this.pickFirstString(
        jobResult.mediaId,
        jobResult.MediaId,
        aiResult.mediaId,
        aiResult.MediaId,
        output.mediaId,
        output.MediaId,
      );
      const videoUrl = this.pickFirstString(
        jobResult.mediaUrl,
        jobResult.MediaUrl,
        jobResult.mediaURL,
        jobResult.MediaURL,
        aiResult.videoUrl,
        aiResult.VideoUrl,
        aiResult.videoURL,
        aiResult.VideoURL,
        aiResult.mediaUrl,
        aiResult.MediaUrl,
        aiResult.mediaURL,
        aiResult.MediaURL,
        output.videoUrl,
        output.VideoUrl,
        output.videoURL,
        output.VideoURL,
        output.mediaUrl,
        output.MediaUrl,
        output.mediaURL,
        output.MediaURL,
        smartOutputConfig.mediaUrl,
        smartOutputConfig.MediaUrl,
        smartOutputConfig.mediaURL,
        smartOutputConfig.MediaURL,
      );
      const maskUrl = this.pickFirstString(
        aiResult.maskUrl,
        aiResult.MaskUrl,
        aiResult.maskURL,
        aiResult.MaskURL,
        output.maskUrl,
        output.MaskUrl,
        output.maskURL,
        output.MaskURL,
      );
      const rawSubtitleClips = aiResult.subtitleClips ?? aiResult.SubtitleClips ?? output.subtitleClips ?? output.SubtitleClips;
      const subtitleClips = Array.isArray(rawSubtitleClips)
        ? rawSubtitleClips
        : this.parseJsonLike<any[]>(rawSubtitleClips);

      return {
        status: body?.state || 'UNKNOWN',
        ...(mediaId && { mediaId }),
        ...(videoUrl && { videoUrl }),
        ...(maskUrl && { maskUrl }),
        ...(subtitleClips && { subtitleClips }),
        ...(body?.errorCode && { errorCode: body.errorCode }),
        ...(body?.errorMessage && { errorMessage: body.errorMessage }),
      };
    } catch (error: any) {
      this.logger.error(`Get smart handle job failed: ${error.message}`);
      throw new Error(`查询数字人任务失败: ${error.message}`);
    }
  }

  normalizeSpeechRate(rate: number): number {
    if (!rate || rate === 1 || !Number.isFinite(rate) || rate <= 0) {
      return 0;
    }

    const imsRate = rate > 1
      ? Math.round((1 - 1 / rate) / 0.001)
      : Math.round((1 - 1 / rate) / 0.002);

    return Math.max(-500, Math.min(500, imsRate));
  }

  buildAvatarEditingConfig(config: {
    avatarId: string;
    voice?: string;
    customizedVoice?: string;
    uiSpeechRate?: number;
    imsSpeechRate?: number;
    loopMotion?: boolean;
    pitchRate?: number;
    volume?: number;
    backgroundUrl?: string;
  }): any {
    if (config.uiSpeechRate !== undefined && config.imsSpeechRate !== undefined) {
      throw new Error('Ambiguous speech rate input: use either uiSpeechRate or imsSpeechRate');
    }

    const speechRate = config.imsSpeechRate !== undefined
      ? Math.max(-500, Math.min(500, Math.round(config.imsSpeechRate)))
      : config.uiSpeechRate !== undefined
        ? this.normalizeSpeechRate(config.uiSpeechRate)
        : undefined;

    return {
      AvatarId: config.avatarId,
      ...(config.voice && { Voice: config.voice }),
      ...(config.customizedVoice && { CustomizedVoice: config.customizedVoice }),
      ...(speechRate !== undefined && { SpeechRate: speechRate }),
      ...(config.loopMotion !== undefined && { LoopMotion: config.loopMotion }),
      ...(config.pitchRate !== undefined && { PitchRate: config.pitchRate }),
      ...(config.volume !== undefined && { Volume: config.volume }),
      ...(config.backgroundUrl && { BackgroundUrl: config.backgroundUrl }),
    };
  }

  // ========== Timeline 单视频合成 (SubmitMediaProducingJob) ==========

  /**
   * 提交 Timeline 合成任务（单视频）
   * 用于数字人交错混剪：将 DH 片段和素材片段按 Timeline 精确编排
   */
  async submitTimelineJob(
    timeline: any,
    outputConfig: { mediaUrl: string; width?: number; height?: number },
    callbackUrl?: string,
    callbackToken?: string,
  ): Promise<{ jobId: string; mediaId?: string }> {
    this.logger.log('Submitting timeline media producing job');

    const client = this.getClient();

    const outputMediaConfig: any = { MediaURL: outputConfig.mediaUrl };
    if (outputConfig.width && outputConfig.height) {
      outputMediaConfig.Width = outputConfig.width;
      outputMediaConfig.Height = outputConfig.height;
    }

    const request = new $ICE20201109.SubmitMediaProducingJobRequest({
      clientToken: `ims-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timeline: JSON.stringify(timeline),
      outputMediaConfig: JSON.stringify(outputMediaConfig),
      outputMediaTarget: 'oss-object',
      source: 'OpenAPI',
    });

    if (callbackUrl) {
      const userData: any = { NotifyAddress: callbackUrl };
      if (callbackToken) userData.CallbackToken = callbackToken;
      request.userData = JSON.stringify(userData);
    }

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.submitMediaProducingJobWithOptions(request, runtime);
      const jobId = response.body?.jobId || '';
      const mediaId = response.body?.mediaId || undefined;
      this.logger.log(`Timeline job submitted: ${jobId}`);
      return { jobId, mediaId };
    } catch (error: any) {
      this.logger.error(`Timeline job submit failed: ${error.message}`);
      throw new Error(`IMS Timeline 合成任务提交失败: ${error.message}`);
    }
  }

  /**
   * 查询单视频合成任务状态
   * 状态: Init → Queuing → Processing → Success/Failed
   */
  async checkMediaProducingJobStatus(jobId: string): Promise<{
    status: string;
    mediaUrl?: string;
    mediaId?: string;
    progress?: number;
    duration?: number;
    errorCode?: string;
    errorMessage?: string;
  }> {
    const client = this.getClient();
    const request = new $ICE20201109.GetMediaProducingJobRequest({ jobId });
    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.getMediaProducingJobWithOptions(request, runtime);
      const job = response.body?.mediaProducingJob;

      if (!job) {
        return { status: 'UNKNOWN' };
      }

      return {
        status: job.status || 'UNKNOWN',
        mediaUrl: job.mediaURL || undefined,
        mediaId: job.mediaId || undefined,
        progress: job.progress,
        duration: job.duration,
        errorCode: job.code || undefined,
        errorMessage: job.message || undefined,
      };
    } catch (error: any) {
      this.logger.error(`Check media producing job failed: ${error.message}`);
      throw new Error(`查询合成任务失败: ${error.message}`);
    }
  }

  /**
   * 获取系统预置数字人列表
   */
  async listBuiltinAvatars(pageNo = 1, pageSize = 100): Promise<{
    avatars: { avatarId: string; avatarName: string; coverUrl: string; videoUrl: string; width: number; height: number; outputMask: boolean }[];
    totalCount: number;
  }> {
    const client = this.getClient();
    const request = new $ICE20201109.ListSmartSysAvatarModelsRequest({ pageNo, pageSize });
    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.listSmartSysAvatarModelsWithOptions(request, runtime);
      const list = (response.body?.smartSysAvatarModelList as any[]) || [];

      return {
        avatars: list.map((a: any) => ({
          avatarId: a.avatarId || a.AvatarId || '',
          avatarName: a.avatarName || a.AvatarName || '',
          coverUrl: a.coverUrl || a.CoverUrl || '',
          videoUrl: a.videoUrl || a.VideoUrl || '',
          width: a.width || a.Width || 0,
          height: a.height || a.Height || 0,
          outputMask: a.outputMask ?? a.OutputMask ?? false,
        })),
        totalCount: response.body?.totalCount || 0,
      };
    } catch (error: any) {
      this.logger.error(`List builtin avatars failed: ${error.message}`);
      throw new Error(`获取系统数字人列表失败: ${error.message}`);
    }
  }

  /**
   * 通过 Timeline 拼接多个视频片段为一个视频
   * 用于将多个 S2V 数字人片段 + 素材片段按顺序拼接
   */
  async concatVideos(
    clips: { mediaUrl: string; in?: number; out?: number }[],
    outputUrl: string,
    width: number,
    height: number,
    callbackUrl?: string,
    callbackToken?: string,
  ): Promise<{ jobId: string }> {
    const timeline = {
      VideoTracks: [{
        VideoTrackClips: clips.map((c) => ({
          MediaURL: c.mediaUrl,
          ...(c.in !== undefined && { In: c.in }),
          ...(c.out !== undefined && { Out: c.out }),
        })),
      }],
    };

    const result = await this.submitTimelineJob(
      timeline,
      { mediaUrl: outputUrl, width, height },
      callbackUrl,
      callbackToken,
    );

    return { jobId: result.jobId };
  }
}
