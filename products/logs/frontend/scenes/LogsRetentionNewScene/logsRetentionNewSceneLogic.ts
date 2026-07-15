import { kea, path, selectors } from 'kea'

import { Scene } from 'scenes/sceneTypes'

import { Breadcrumb } from '~/types'

import { logsRetentionRulesSettingsUrl } from 'products/logs/frontend/logsRetentionRulesSettingsUrl'

import type { logsRetentionNewSceneLogicType } from './logsRetentionNewSceneLogicType'

export const logsRetentionNewSceneLogic = kea<logsRetentionNewSceneLogicType>([
    path(['products', 'logs', 'frontend', 'scenes', 'LogsRetentionNewScene', 'logsRetentionNewSceneLogic']),

    selectors({
        breadcrumbs: [
            () => [],
            (): Breadcrumb[] => [
                {
                    key: Scene.Logs,
                    name: 'Logs',
                    path: logsRetentionRulesSettingsUrl(),
                    iconType: 'logs',
                },
                { key: Scene.LogsRetentionNew, name: 'New retention rule', iconType: 'logs' },
            ],
        ],
    }),
])
