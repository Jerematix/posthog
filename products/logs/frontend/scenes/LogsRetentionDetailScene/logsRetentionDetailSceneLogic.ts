import { actions, afterMount, connect, kea, key, listeners, path, props, selectors } from 'kea'
import { loaders } from 'kea-loaders'
import { router } from 'kea-router'

import { lemonToast } from '@posthog/lemon-ui'

import { Scene } from 'scenes/sceneTypes'
import { teamLogic } from 'scenes/teamLogic'

import { Breadcrumb } from '~/types'

import {
    buildRetentionFormDefaults,
    logsRetentionFormLogic,
} from 'products/logs/frontend/components/LogsRetention/logsRetentionFormLogic'
import { logsRetentionRulesDestroy, logsRetentionRulesRetrieve } from 'products/logs/frontend/generated/api'
import { LogsRetentionRuleApi } from 'products/logs/frontend/generated/api.schemas'
import { logsRetentionRulesSettingsUrl } from 'products/logs/frontend/logsRetentionRulesSettingsUrl'

import type { logsRetentionDetailSceneLogicType } from './logsRetentionDetailSceneLogicType'

export interface LogsRetentionDetailSceneLogicProps {
    id: string
}

export const logsRetentionDetailSceneLogic = kea<logsRetentionDetailSceneLogicType>([
    path((key) => [
        'products',
        'logs',
        'frontend',
        'scenes',
        'LogsRetentionDetailScene',
        'logsRetentionDetailSceneLogic',
        key,
    ]),
    props({} as LogsRetentionDetailSceneLogicProps),
    key((props) => props.id),

    connect((props: LogsRetentionDetailSceneLogicProps) => ({
        values: [teamLogic, ['currentTeamId']],
        actions: [logsRetentionFormLogic({ rule: { id: props.id } as LogsRetentionRuleApi }), ['resetRetentionForm']],
    })),

    actions({
        deleteRule: true,
    }),

    loaders(({ values, props }) => ({
        rule: [
            null as LogsRetentionRuleApi | null,
            {
                loadRule: async () => logsRetentionRulesRetrieve(String(values.currentTeamId), props.id),
            },
        ],
    })),

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
                { key: Scene.LogsRetentionDetail, name: 'Retention rule', iconType: 'logs' },
            ],
        ],
    }),

    listeners(({ actions, values, props }) => ({
        loadRuleSuccess: () => {
            if (values.rule) {
                actions.resetRetentionForm(buildRetentionFormDefaults(values.rule))
            }
        },
        deleteRule: async () => {
            try {
                await logsRetentionRulesDestroy(String(values.currentTeamId), props.id)
                lemonToast.success('Rule deleted')
                router.actions.push(logsRetentionRulesSettingsUrl())
            } catch (e: any) {
                lemonToast.error(e?.detail ?? e?.message ?? 'Failed to delete')
            }
        },
    })),

    afterMount(({ actions }) => {
        actions.loadRule()
    }),
])
