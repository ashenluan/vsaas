import type { ShotMaterial } from '../_store/use-mixcut-store';

export function getMixcutMaterialTrimState(material: ShotMaterial) {
  const hasTrimIn = material.trimIn !== undefined;
  const hasTrimOut = material.trimOut !== undefined;
  const isPartial = hasTrimIn !== hasTrimOut;
  const isInverted = hasTrimIn && hasTrimOut && material.trimOut! <= material.trimIn!;

  return {
    hasTrimIn,
    hasTrimOut,
    isPartial,
    isInverted,
    isValid: hasTrimIn && hasTrimOut && material.trimOut! > material.trimIn!,
  };
}

export function getMixcutMaterialTrimError(material: ShotMaterial) {
  const state = getMixcutMaterialTrimState(material);

  if (state.isPartial) {
    return '请同时填写开始和结束时间';
  }

  if (state.isInverted) {
    return '结束时间必须大于开始时间';
  }

  return null;
}

export function getEffectiveMixcutMaterialDuration(material: ShotMaterial) {
  const state = getMixcutMaterialTrimState(material);

  if (state.isValid) {
    return material.trimOut! - material.trimIn!;
  }

  return material.duration || 3;
}
