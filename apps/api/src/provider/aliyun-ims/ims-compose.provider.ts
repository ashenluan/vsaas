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
export const ADVANCED_TRANSITION_LIST: { id: string; label: string }[] = [
  { id: 'OT0001-01-0001', label: '翻页' }, { id: 'OT0001-01-0002', label: '开合' },
  { id: 'OT0001-01-0003', label: '对角线开合' }, { id: 'OT0001-01-0004', label: '百叶窗' },
  { id: 'OT0001-01-0005', label: '滑动推移' }, { id: 'OT0001-01-0006', label: '向下滑推' },
  { id: 'OT0001-01-0007', label: '向左滑推' }, { id: 'OT0001-01-0008', label: '向上滑推' },
  { id: 'OT0001-01-0009', label: '水平分割' }, { id: 'OT0001-01-0010', label: '立方体旋转' },
  { id: 'OT0001-01-0011', label: '翻转' }, { id: 'OT0001-01-0012', label: '向下翻转' },
  { id: 'OT0001-01-0013', label: '向左翻转' }, { id: 'OT0001-01-0014', label: '向上翻转' },
  { id: 'OT0001-01-0015', label: '分割翻转' }, { id: 'OT0001-02-0001', label: '旋转擦除' },
  { id: 'OT0001-02-0002', label: '椭圆扩展' }, { id: 'OT0001-02-0003', label: '条纹擦除' },
  { id: 'OT0001-02-0004', label: '棱形擦除' }, { id: 'OT0001-02-0005', label: '星形擦除' },
  { id: 'OT0001-02-0006', label: '心形擦除' }, { id: 'OT0001-02-0007', label: '爱心闪亮' },
  { id: 'OT0001-02-0008', label: '横向擦除' }, { id: 'OT0001-02-0009', label: '纵向擦除' },
  { id: 'OT0001-02-0010', label: '圆形擦除' }, { id: 'OT0001-03-0001', label: '粒子消散' },
  { id: 'OT0001-03-0002', label: '爆裂冲击' }, { id: 'OT0001-03-0003', label: '破碎消散' },
  { id: 'OT0001-03-0004', label: '震碎' }, { id: 'OT0001-03-0005', label: '信号故障' },
  { id: 'OT0001-03-0006', label: '噪声破碎' }, { id: 'OT0001-03-0007', label: '抖动过渡' },
  { id: 'OT0001-03-0008', label: '毛刺过渡' }, { id: 'OT0001-03-0009', label: '抖动模糊' },
  { id: 'OT0001-04-0001', label: '缩放过渡' }, { id: 'OT0001-04-0002', label: '平移过渡' },
  { id: 'OT0001-04-0003', label: '旋转缩放' }, { id: 'OT0001-04-0004', label: '镜头推近' },
  { id: 'OT0001-04-0005', label: '镜头拉远' }, { id: 'OT0001-04-0006', label: '俯冲' },
  { id: 'OT0001-05-0001', label: '闪白过渡' }, { id: 'OT0001-05-0002', label: '闪黑过渡' },
  { id: 'OT0001-05-0003', label: '高斯模糊' }, { id: 'OT0001-05-0004', label: '径向模糊' },
  { id: 'OT0001-05-0005', label: '交叉溶解' }, { id: 'OT0001-05-0006', label: '入幕' },
  { id: 'OT0001-05-0007', label: '渐隐' }, { id: 'OT0001-05-0008', label: '拉丝过渡' },
  { id: 'OT0001-06-0001', label: '色彩分离' }, { id: 'OT0001-06-0002', label: '光效过渡' },
  { id: 'OT0001-06-0003', label: '圆点过渡' }, { id: 'OT0001-06-0004', label: '马赛克过渡' },
  { id: 'OT0001-06-0005', label: '水波纹过渡' }, { id: 'OT0001-06-0006', label: '画面旋转' },
  { id: 'OT0001-06-0007', label: '果冻效果' }, { id: 'OT0001-06-0008', label: '延迟分屏' },
  { id: 'OT0001-06-0009', label: '圆形放大' }, { id: 'OT0001-06-0010', label: '全息过渡' },
  { id: 'OT0001-06-0011', label: '通道过渡' }, { id: 'OT0001-06-0012', label: '方块旋转' },
];

// ========== 字体枚举 ==========
export const FONT_LIST: { id: string; label: string; chinese: boolean }[] = [
  { id: 'alibaba-puhuiti-medium', label: '阿里巴巴普惠体 Medium', chinese: true },
  { id: 'alibaba-puhuiti-bold', label: '阿里巴巴普惠体 Bold', chinese: true },
  { id: 'alibaba-puhuiti-heavy', label: '阿里巴巴普惠体 Heavy', chinese: true },
  { id: 'fangsong', label: '仿宋', chinese: true },
  { id: 'heiti', label: '黑体', chinese: true },
  { id: 'kaiti', label: '楷体', chinese: true },
  { id: 'lishu', label: '隶书', chinese: true },
  { id: 'songti', label: '宋体', chinese: true },
  { id: 'youyuan', label: '幼圆', chinese: true },
  { id: 'siyuan-medium', label: '思源黑体 Medium', chinese: true },
  { id: 'siyuan-bold', label: '思源黑体 Bold', chinese: true },
  { id: 'siyuan-heavy', label: '思源黑体 Heavy', chinese: true },
  { id: 'pangmen', label: '庞门正道标题体', chinese: true },
  { id: 'zcool-happy', label: '站酷快乐体', chinese: true },
  { id: 'zcool-kuaile', label: '站酷酷黑体', chinese: true },
  { id: 'zcool-gaoduanhei', label: '站酷高端黑', chinese: true },
  { id: 'arial', label: 'Arial', chinese: false },
  { id: 'times-new-roman', label: 'Times New Roman', chinese: false },
  { id: 'courier-new', label: 'Courier New', chinese: false },
];

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

  async checkJobStatus(jobId: string): Promise<{ status: string; subJobs?: any[]; progress?: number }> {
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
      if (allFailed) status = 'Failed';

      return {
        status,
        progress,
        subJobs: subJobs.map((sj: any) => ({
          mediaId: sj.mediaId,
          mediaURL: sj.mediaURL,
          duration: sj.duration,
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
    }[];
    speechTexts?: string[];
    titles?: string[];
    subHeadings?: { level: number; titles: string[] }[];
    backgroundMusic?: string[];
    stickers?: { url: string; x: number; y: number; width: number; height: number; opacity?: number; dyncFrames?: number }[];
    backgroundImages?: string[];
  }): any {
    const inputConfig: any = {
      MediaGroupArray: config.mediaGroups.map((g) => ({
        GroupName: g.groupName,
        MediaArray: g.mediaUrls,
        ...(g.speechTexts && { SpeechTextArray: g.speechTexts }),
        ...(g.duration && { Duration: g.duration }),
        ...(g.splitMode && { SplitMode: g.splitMode }),
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

  /**
   * 构建 EditingConfig — 剪辑配置
   * 包含：字幕、特效、转场、滤镜、人声等完整配置
   */
  buildEditingConfig(config: {
    // 媒体音量
    mediaVolume?: number;
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
  }): any {
    const editingConfig: any = {
      MediaConfig: { Volume: config.mediaVolume ?? 1 },
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
      },
    };

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
        ...(config.backgroundImageType && { Type: config.backgroundImageType }),
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
    crf?: number;
  }): any {
    return {
      MediaURL: config.outputUrl,
      Count: config.count,
      Width: config.width,
      Height: config.height,
      ...(config.maxDuration && { MaxDuration: config.maxDuration }),
      ...(config.crf && { Video: { Crf: config.crf } }),
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
}
