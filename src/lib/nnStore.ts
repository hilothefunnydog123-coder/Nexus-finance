import type { SupabaseClient } from '@supabase/supabase-js'
import { createModel, deserialize, NN_ARCH, type NNModel } from './nn'

/** Load the persisted network (or a fresh one if none / incompatible). */
export async function loadModel(admin: SupabaseClient): Promise<NNModel> {
  try {
    const { data } = await admin.from('nn_model').select('model').eq('id', 1).maybeSingle()
    const m = data?.model ? deserialize(data.model) : null
    return m ?? createModel()
  } catch {
    return createModel()
  }
}

/** Load only if it has actually been trained — otherwise return null so the
 *  forecaster uses its transparent baseline instead of a random net. */
export async function loadTrainedModel(admin: SupabaseClient): Promise<NNModel | null> {
  try {
    const { data } = await admin.from('nn_model').select('model,trained').eq('id', 1).maybeSingle()
    if (!data?.model || (data.trained ?? 0) < 50) return null // needs a little experience first
    return deserialize(data.model)
  } catch {
    return null
  }
}

export async function saveModel(admin: SupabaseClient, model: NNModel) {
  const avg_loss = model.trained ? +(model.sumLoss / model.trained).toFixed(5) : 0
  const dir_acc = model.trained ? +((model.dirHits / model.trained) * 100).toFixed(1) : 0
  await admin.from('nn_model').upsert({
    id: 1,
    model,
    arch: NN_ARCH,
    trained: model.trained,
    avg_loss,
    dir_acc,
    updated_at: new Date().toISOString(),
  })
}
