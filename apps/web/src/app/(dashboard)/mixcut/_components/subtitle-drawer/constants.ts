export const FONTS = [
  { value: 'Alibaba PuHuiTi', label: '阿里巴巴普惠体' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimSun', label: '宋体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'FZFangSong-Z02S', label: '方正仿宋简体' },
  { value: 'FZHei-B01S', label: '方正黑体简体' },
  { value: 'FZKai-Z03S', label: '方正楷体简体' },
  { value: 'FZShuSong-Z01S', label: '方正书宋简体' },
  { value: 'Source Han Sans CN', label: '思源黑体' },
  { value: 'Source Han Serif CN', label: '思源宋体' },
  { value: 'WenQuanYi MicroHei', label: '文泉驿微米黑' },
  { value: 'WenQuanYi Zen Hei Mono', label: '文泉驿等宽正黑' },
  { value: 'WenQuanYi Zen Hei Sharp', label: '文泉驿点阵正黑' },
  { value: 'Yuanti SC', label: '圆体' },
  { value: 'HappyZcool-2016', label: '站酷快乐体' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Roboto Bold', label: 'Roboto Bold' },
];

export const ALIGNMENTS = [
  { value: 'TopCenter', label: '顶部居中' },
  { value: 'BottomCenter', label: '底部居中' },
  { value: 'CenterCenter', label: '正中' },
];

export const TITLE_PRESETS = [
  { name: '经典白字', font: 'Alibaba PuHuiTi 2.0 95 ExtraBold', fontSize: 56, fontColor: '#ffffff', y: 0.08 },
  { name: '金色大标题', font: 'Source Han Sans CN', fontSize: 72, fontColor: '#FFD700', y: 0.06 },
  { name: '红色醒目', font: 'Source Han Sans CN', fontSize: 64, fontColor: '#FF4444', y: 0.08 },
  { name: '清新绿', font: 'Alibaba PuHuiTi', fontSize: 48, fontColor: '#00E676', y: 0.10 },
  { name: '科技蓝', font: 'Roboto Bold', fontSize: 52, fontColor: '#00B0FF', y: 0.08 },
  { name: '温暖橙', font: 'Yuanti SC', fontSize: 56, fontColor: '#FF9800', y: 0.08 },
  { name: '优雅楷体', font: 'FZKai-Z03S', fontSize: 52, fontColor: '#ffffff', y: 0.10 },
  { name: '中央大字', font: 'Alibaba PuHuiTi 2.0 95 ExtraBold', fontSize: 80, fontColor: '#ffffff', y: 0.40 },
];

export const COPY_TEMPLATES: Record<string, { title: string; text: string }[]> = {
  '促销': [
    { title: '限时优惠', text: '限时特惠来啦！原价XXX，现在只要XXX！数量有限，先到先得，手慢无！' },
    { title: '新品上市', text: '全新升级，重磅来袭！我们精心打磨了这款新品，只为给你最好的体验。' },
    { title: '买一送一', text: '买一送一！没有套路，就是实实在在的福利！快来抢购吧，错过再等一年！' },
    { title: '清仓甩卖', text: '清仓大甩卖！全场低至X折，库存见底，卖完即止！赶紧来捡漏！' },
    { title: '满减活动', text: '满XXX减XXX，越买越划算！凑单攻略已经帮你整理好了，闭眼入不踩雷！' },
  ],
  '种草': [
    { title: '好物推荐', text: '用了一个月，真的回购了三次！这个宝藏好物必须安利给你们！' },
    { title: '测评分享', text: '全网最火的XXX，到底值不值得买？今天给大家做一个真实测评！' },
    { title: '平替推荐', text: '大牌平替来了！只要十分之一的价格，效果却不输大牌！' },
    { title: '合集推荐', text: '这几款神器我真的离不开了！每一个都是精挑细选，闭眼入！' },
  ],
  '知识': [
    { title: '科普讲解', text: '你知道吗？其实很多人都不了解这个小知识，今天就来给大家科普一下！' },
    { title: '干货分享', text: '整理了X个超实用的技巧，每一个都能帮你省时省力，建议收藏！' },
    { title: '误区纠正', text: '注意！这个你一直以为对的做法，其实是错的！正确的方法应该是……' },
    { title: '行业揭秘', text: '行业内部人员告诉你，这些不为人知的内幕，看完你就明白了！' },
  ],
  '情感': [
    { title: '励志鸡汤', text: '生活总会有不如意的时候，但请相信，所有的努力都不会白费。' },
    { title: '情感共鸣', text: '有没有那么一瞬间，你突然觉得自己很累？其实你不必那么坚强。' },
    { title: '人生感悟', text: '走过了这么多路，才明白最珍贵的不是沿途的风景，而是陪你看风景的人。' },
  ],
  '生活': [
    { title: '日常分享', text: '今天的一日三餐分享！简单又美味的家常菜，跟着做就行！' },
    { title: '收纳整理', text: '换季收纳小技巧！学会这几招，再小的房间也能井井有条！' },
    { title: '出行攻略', text: '去XXX旅游一定要看这篇攻略！帮你避开所有坑，省钱又省心！' },
  ],
  'Vlog': [
    { title: '日常Vlog', text: '记录今天的生活，平凡却幸福的一天。来看看我的日常吧！' },
    { title: '挑战Vlog', text: '挑战XXX！这真的太难了，但我决定试一试，最后的结果连我自己都没想到！' },
    { title: '探店Vlog', text: '打卡了一家超火的XXX店！到底是名不虚传还是言过其实？跟我来看看！' },
  ],
};
