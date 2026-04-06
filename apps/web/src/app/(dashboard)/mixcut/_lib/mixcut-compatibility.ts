import type { GlobalConfig, MixcutProject } from '../_store/use-mixcut-store';
import { getMixcutMaterialTrimState } from './mixcut-trim';

export type MixcutSpeechMode = 'global' | 'group';

export function getMixcutSpeechMode(project: MixcutProject): MixcutSpeechMode {
  if (project.speechMode === 'global' || project.speechMode === 'group') {
    return project.speechMode;
  }

  const enabledGroups = project.shotGroups.filter((group) => group.enabled !== false);
  const hasGroupSpeech = enabledGroups.some((group) =>
    group.subtitles.some((subtitle) => subtitle.text.trim().length > 0),
  );

  return hasGroupSpeech ? 'group' : 'global';
}

export function getMixcutCompatibilityErrors({
  project,
  globalConfig,
}: {
  project: MixcutProject;
  globalConfig: GlobalConfig;
}) {
  const errors: string[] = [];
  const speechMode = getMixcutSpeechMode(project);

  if (globalConfig.maxDuration > 0 && globalConfig.fixedDuration > 0) {
    errors.push('最大时长与固定时长不能同时设置。');
  }

  if (speechMode === 'group' && globalConfig.fixedDuration > 0) {
    errors.push('当前项目已进入分组口播模式，不能设置固定时长。');
  }

  if (speechMode === 'group' && globalConfig.maxDuration > 0) {
    errors.push('当前项目已进入分组口播模式，不能设置最大时长。');
  }

  if (speechMode === 'group' && globalConfig.alignmentMode) {
    errors.push('当前项目已进入分组口播模式，不能设置对齐模式。');
  }

  const materials = project.shotGroups
    .filter((group) => group.enabled !== false)
    .flatMap((group) => group.materials);

  if (materials.some((material) => getMixcutMaterialTrimState(material).isPartial)) {
    errors.push('存在未完成的素材裁剪区间，请同时填写开始和结束时间。');
  }

  if (materials.some((material) => getMixcutMaterialTrimState(material).isInverted)) {
    errors.push('存在结束时间小于开始时间的素材裁剪区间，请修正后再提交。');
  }

  return errors;
}
